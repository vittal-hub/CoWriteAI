import { WebSocketServer } from 'ws';
import { URL } from 'url';
import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import { bindNotificationPusher } from '../utils/notify.js';

// userId -> Set<ws>            (all live connections for a user, any page)
const userSockets = new Map();
// docId  -> Map<userId, { ws, user, cursor }>   (who is actively viewing/editing a document)
const docRooms = new Map();

const send = (ws, type, payload) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
};

const addUserSocket = (userId, ws) => {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(ws);
};

const removeUserSocket = (userId, ws) => {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) userSockets.delete(userId);
};

const pushToUser = (userId, { type, payload }) => {
  const set = userSockets.get(userId);
  if (!set) return;
  for (const ws of set) send(ws, type, payload);
};
bindNotificationPusher(pushToUser);

// Fixed 5-slot palette matching the app's existing pen-0..pen-4 color system
// (Avatar/PresenceStack/drawing pens) — assigned per document *session*, not
// from the user's personal (randomly-assigned-at-signup) penColor, so two
// collaborators can never end up with the same cursor color in the same room.
const PEN_SLOTS = 5;

const assignPenIndex = (room) => {
  const used = new Set([...room.values()].map((e) => e.penIndex));
  for (let i = 0; i < PEN_SLOTS; i++) {
    if (!used.has(i)) return i;
  }
  return room.size % PEN_SLOTS;
};

const roomPresenceList = (docId) => {
  const room = docRooms.get(docId);
  if (!room) return [];
  return [...room.values()].map((entry) => ({
    userId: entry.user.id,
    name: entry.user.name,
    penColor: entry.user.penColor,
    penIndex: entry.penIndex,
    avatarUrl: entry.user.avatarUrl,
    initials: entry.user.initials,
    cursor: entry.cursor,
  }));
};

const broadcastToDoc = (docId, message, { excludeUserId } = {}) => {
  const room = docRooms.get(docId);
  if (!room) return;
  for (const [userId, entry] of room.entries()) {
    if (excludeUserId && String(userId) === String(excludeUserId)) continue;
    send(entry.ws, message.type, message.payload);
  }
};

const joinDocRoom = (docId, userId, ws, user, permission) => {
  if (!docRooms.has(docId)) docRooms.set(docId, new Map());
  const room = docRooms.get(docId);
  const penIndex = assignPenIndex(room);
  room.set(userId, { ws, user, cursor: null, penIndex, permission });

  // Tell everyone else someone joined, then give the joiner the current roster.
  broadcastToDoc(
    docId,
    { type: 'presence:join', payload: { user: { ...user, penIndex } } },
    { excludeUserId: userId }
  );
  send(ws, 'presence:state', { collaborators: roomPresenceList(docId) });
};

const leaveDocRoom = (docId, userId, ws) => {
  const room = docRooms.get(docId);
  if (!room) return;
  const entry = room.get(userId);
  // A stale connection (e.g. the old tab/socket after a refresh opens a new
  // one) closing later must not evict the user's now-current connection —
  // otherwise a refresh briefly broadcasts a spurious "user left" for someone
  // who is, in fact, still present.
  if (entry && entry.ws !== ws) return;
  room.delete(userId);
  if (room.size === 0) docRooms.delete(docId);
  else broadcastToDoc(docId, { type: 'presence:leave', payload: { userId } });
};

// Debounced persistence so rapid keystrokes don't hammer the DB.
const pendingSaves = new Map(); // docId -> timeout handle
const scheduleContentSave = (docId, content, version, userId) => {
  clearTimeout(pendingSaves.get(docId));
  const handle = setTimeout(async () => {
    pendingSaves.delete(docId);
    try {
      await Document.findByIdAndUpdate(docId, {
        content,
        version,
        lastEditedAt: new Date(),
        lastEditedBy: userId,
      });
    } catch (err) {
      console.error(`[ws] Failed to persist document ${docId}:`, err.message);
    }
  }, 800);
  pendingSaves.set(docId, handle);
};

export const initWebSocketServer = (httpServer) => {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    const { searchParams } = new URL(req.url, 'http://localhost');
    const cookies = req.headers.cookie
      ? req.headers.cookie.split(';').reduce((res, item) => {
          const data = item.trim().split('=');
          return { ...res, [data[0]]: data[1] };
        }, {})
      : {};
    const token = searchParams.get('token') || cookies.token;
    const docId = searchParams.get('docId') || null;

    let userDoc;
    try {
      const decoded = verifyToken(token);
      userDoc = await User.findById(decoded.sub);
      if (!userDoc) throw new Error('User not found');
    } catch {
      send(ws, 'error', { message: 'Authentication failed' });
      ws.close(4001, 'Unauthorized');
      return;
    }

    const user = userDoc.toPublicJSON();
    const userId = String(user.id);

    let currentDocId = null;
    if (docId) {
      const doc = await Document.findById(docId).catch(() => null);
      const directPermission = doc && !doc.isDeleted ? doc.permissionFor(userId) : null;
      // Mirrors middleware/documentAccess.js's loadDocument logic: a public
      // view/edit link grants that level of access even without a formal
      // (accepted) collaborator entry.
      const isPublicViewable = doc && !doc.isDeleted && ['view', 'edit'].includes(doc.linkAccess);
      const effectivePermission = directPermission || (isPublicViewable ? doc.linkAccess : null);

      if (!effectivePermission) {
        send(ws, 'error', { message: 'No access to this document' });
        ws.close(4003, 'Forbidden');
        return;
      }
      currentDocId = docId;
      joinDocRoom(currentDocId, userId, ws, user, effectivePermission);
    }

    addUserSocket(userId, ws);
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const { type, payload = {} } = msg;

      // A view-only collaborator (or a public "view" link visitor) must not be
      // able to mutate the document just because they're connected to the
      // room — the REST API enforces this via loadDocument('edit'), but this
      // socket previously trusted anyone present in the room. Re-check on
      // every mutating message rather than only at connect time, so a
      // permission downgrade (owner revokes access / flips the link to
      // view-only) mid-session takes effect immediately instead of only on
      // the visitor's next reconnect.
      const canEdit = () => {
        const room = docRooms.get(currentDocId);
        const permission = room?.get(userId)?.permission;
        return permission === 'owner' || permission === 'edit';
      };

      switch (type) {
        case 'presence:cursor': {
          if (!currentDocId) return;
          const room = docRooms.get(currentDocId);
          const entry = room?.get(userId);
          if (entry) entry.cursor = payload.cursor;
          broadcastToDoc(
            currentDocId,
            { type: 'presence:cursor', payload: { userId, cursor: payload.cursor } },
            { excludeUserId: userId }
          );
          break;
        }

        case 'doc:update': {
          if (!currentDocId || !canEdit()) return;
          broadcastToDoc(
            currentDocId,
            { type: 'doc:update', payload: { content: payload.content, version: payload.version, userId } },
            { excludeUserId: userId }
          );
          scheduleContentSave(currentDocId, payload.content, payload.version, userId);
          break;
        }

        case 'draw:stroke': {
          if (!currentDocId || !canEdit()) return;
          try {
            await Document.findByIdAndUpdate(currentDocId, {
              $push: { strokes: { ...payload.stroke, author: userId } },
            });
          } catch (err) {
            console.error('[ws] Failed to persist stroke:', err.message);
          }
          broadcastToDoc(
            currentDocId,
            { type: 'draw:stroke', payload: { stroke: payload.stroke, userId } },
            { excludeUserId: userId }
          );
          break;
        }

        case 'draw:clear': {
          if (!currentDocId || !canEdit()) return;
          try {
            await Document.findByIdAndUpdate(currentDocId, { strokes: [] });
          } catch (err) {
            console.error('[ws] Failed to clear strokes:', err.message);
          }
          broadcastToDoc(currentDocId, { type: 'draw:clear', payload: { userId } }, { excludeUserId: userId });
          break;
        }

        case 'voice:transcript': {
          // Live "someone is speaking" broadcast; final text is saved via doc:update.
          if (!currentDocId) return;
          broadcastToDoc(
            currentDocId,
            { type: 'voice:transcript', payload: { ...payload, userId } },
            { excludeUserId: userId }
          );
          break;
        }

        case 'ping': {
          send(ws, 'pong', {});
          break;
        }

        default:
          break;
      }
    });

    ws.on('close', () => {
      removeUserSocket(userId, ws);
      if (currentDocId) leaveDocRoom(currentDocId, userId, ws);
    });

    ws.on('error', () => {
      removeUserSocket(userId, ws);
      if (currentDocId) leaveDocRoom(currentDocId, userId, ws);
    });
  });

  // Heartbeat: terminate dead connections every 30s.
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  console.log('[ws] WebSocket server attached at /ws');
  return wss;
};

export { broadcastToDoc, pushToUser };
