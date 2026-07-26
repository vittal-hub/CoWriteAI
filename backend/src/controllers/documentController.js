import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Document from '../models/Document.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import { broadcastToDoc } from '../sockets/index.js';

// @route POST /api/documents
export const createDocument = asyncHandler(async (req, res) => {
  const { title } = req.body;
  const doc = await Document.create({
    title: title?.trim() || 'Untitled document',
    owner: req.user._id,
    lastEditedBy: req.user._id,
  });
  res.status(201).json({ success: true, document: doc.toSummaryJSON(req.user._id) });
});

// @route GET /api/documents?scope=all|owned|shared|starred&q=&sort=
export const listDocuments = asyncHandler(async (req, res) => {
  const { scope = 'all', q, sort = '-lastEditedAt' } = req.query;
  const userId = req.user._id;

  const base = { isDeleted: false };
  if (scope === 'owned') {
    base.owner = userId;
  } else if (scope === 'shared') {
    base.owner = { $ne: userId };
    base.collaborators = { $elemMatch: { user: userId, status: 'accepted' } };
  } else if (scope === 'starred') {
    base.starredBy = userId;
  } else {
    base.$or = [
      { owner: userId },
      { collaborators: { $elemMatch: { user: userId, status: 'accepted' } } },
    ];
  }

  if (q) {
    const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = { $regex: escaped, $options: 'i' };
    const titleMatch = { title: regex };
    const contentMatch = { content: regex };
    if (base.$or) {
      // Combine scope filter with search via nested $and
      base.$and = [
        { $or: base.$or },
        { $or: [titleMatch, contentMatch] },
      ];
      delete base.$or;
    } else {
      base.$or = [titleMatch, contentMatch];
    }
  }

  const allowedSorts = ['title', '-title', 'lastEditedAt', '-lastEditedAt', 'createdAt', '-createdAt'];
  const sortField = allowedSorts.includes(sort) ? sort : '-lastEditedAt';

  const docs = await Document.find(base)
    .sort(sortField)
    .populate('owner', 'name penColor avatarUrl email')
    .populate('collaborators.user', 'name penColor avatarUrl email');

  res.json({
    success: true,
    documents: docs.map((d) => {
      // A never-edited document still holds its schema default (a plain
      // object, not the HTML string the editor produces) — stringifying that
      // object rendered a literal "[object Object]" preview/content on every
      // freshly-created, untouched document.
      const plainText = (typeof d.content === 'string' ? d.content : '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const preview = plainText.slice(0, 140);
      return {
        ...d.toSummaryJSON(userId),
        preview,
        content: plainText.slice(0, 5000),
        owner: d.owner,
        collaborators: d.collaborators,
      };
    }),
  });
});

// @route GET /api/documents/:id
export const getDocument = asyncHandler(async (req, res) => {
  const doc = await req.doc.populate([
    { path: 'owner', select: 'name penColor avatarUrl email' },
    { path: 'collaborators.user', select: 'name penColor avatarUrl email' },
    { path: 'strokes.author', select: 'name penColor' },
  ]);

  res.json({
    success: true,
    document: {
      id: doc._id,
      title: doc.title,
      owner: doc.owner,
      content: doc.content,
      version: doc.version,
      strokes: doc.strokes,
      collaborators: doc.collaborators,
      shareToken: doc.shareToken,
      linkAccess: doc.linkAccess,
      permission: req.permission,
      starred: doc.starredBy.some((u) => String(u) === String(req.user._id)),
      lastEditedAt: doc.lastEditedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
  });
});

// @route PATCH /api/documents/:id  (title rename, and REST fallback for content)
export const updateDocument = asyncHandler(async (req, res) => {
  const { title, content } = req.body;

  if (title !== undefined) req.doc.title = title.trim() || 'Untitled document';
  if (content !== undefined) {
    req.doc.content = content;
    req.doc.version += 1;
  }
  req.doc.lastEditedAt = new Date();
  req.doc.lastEditedBy = req.user._id;

  await req.doc.save();

  if (title !== undefined) {
    broadcastToDoc(String(req.doc._id), {
      type: 'doc:title',
      payload: { title: req.doc.title, userId: String(req.user._id) },
    });
  }

  res.json({ success: true, document: req.doc.toSummaryJSON(req.user._id) });
});

// @route PATCH /api/documents/:id/star
export const toggleStar = asyncHandler(async (req, res) => {
  const uid = String(req.user._id);
  const has = req.doc.starredBy.some((u) => String(u) === uid);
  if (has) {
    req.doc.starredBy = req.doc.starredBy.filter((u) => String(u) !== uid);
  } else {
    req.doc.starredBy.push(req.user._id);
  }
  await req.doc.save();
  res.json({ success: true, starred: !has });
});

// @route DELETE /api/documents/:id  (owner only)
export const deleteDocument = asyncHandler(async (req, res) => {
  req.doc.isDeleted = true;
  await req.doc.save();
  await Comment.deleteMany({ document: req.doc._id });

  const recipients = req.doc.collaborators.map((c) => c.user);
  if (recipients.length) {
    await Notification.insertMany(
      recipients.map((r) => ({
        recipient: r,
        actor: req.user._id,
        type: 'document_deleted',
        document: req.doc._id,
        message: `"${req.doc.title}" was deleted by ${req.user.name}`,
      }))
    );
  }

  res.json({ success: true, message: 'Document deleted' });
});

// @route GET /api/documents/shared/:token  (public share link preview/access)
export const getDocumentByShareToken = asyncHandler(async (req, res) => {
  const token = req.params.token;
  const isObjId = mongoose.Types.ObjectId.isValid(token);
  const query = isObjId
    ? { $or: [{ shareToken: token }, { _id: token }], isDeleted: false }
    : { shareToken: token, isDeleted: false };

  const doc = await Document.findOne(query).populate('owner', 'name penColor avatarUrl');

  if (!doc) {
    res.status(404);
    throw new Error('This link is invalid or no longer shared');
  }

  const userId = req.user?._id ? String(req.user._id) : null;
  const isOwner = userId && String(doc.owner?._id || doc.owner) === userId;
  const isCollab = userId && doc.collaborators.some((c) => String(c.user?._id || c.user) === userId);

  if (doc.linkAccess === 'restricted' && !isOwner && !isCollab) {
    res.status(404);
    throw new Error('This link is invalid or no longer shared');
  }

  const requiresPassword = !isOwner && !isCollab && !!doc.sharePassword;

  res.json({
    success: true,
    document: {
      id: doc._id,
      title: doc.title,
      owner: doc.owner,
      linkAccess: doc.linkAccess,
      requiresPassword,
    },
  });
});

// @route POST /api/documents/shared/:token/verify  { password }
export const verifyShareTokenPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const token = req.params.token;
  const isObjId = mongoose.Types.ObjectId.isValid(token);
  const query = isObjId
    ? { $or: [{ shareToken: token }, { _id: token }], isDeleted: false }
    : { shareToken: token, isDeleted: false };

  const doc = await Document.findOne(query).populate('owner', 'name penColor avatarUrl');

  if (!doc) {
    res.status(404);
    throw new Error('This link is invalid or no longer shared');
  }

  const userId = req.user?._id ? String(req.user._id) : null;
  const isOwner = userId && String(doc.owner?._id || doc.owner) === userId;
  const isCollab = userId && doc.collaborators.some((c) => String(c.user?._id || c.user) === userId);

  if (doc.linkAccess === 'restricted' && !isOwner && !isCollab) {
    res.status(404);
    throw new Error('This link is invalid or no longer shared');
  }

  if (!isOwner && !isCollab && doc.sharePassword && !(await doc.compareSharePassword(password))) {
    res.status(401);
    throw new Error('Incorrect password for this document link');
  }

  res.json({
    success: true,
    document: {
      id: doc._id,
      title: doc.title,
      owner: doc.owner,
      linkAccess: doc.linkAccess,
      content: doc.content,
    },
  });
});
