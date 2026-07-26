// ── API Client ─────────────────────────────────────────────────────────────
// VITE_API_URL/VITE_WS_URL (see frontend/.env.example) let this target a
// separately-hosted backend in production; left unset, paths stay relative
// and resolve via the Vite dev proxy locally or same-origin in production.
//
// Auth: the backend sets an httpOnly cookie AND returns the raw JWT in the
// response body. The cookie alone is enough same-origin (local dev, or a
// single combined deployment), but frontend (Netlify) + backend (Render) are
// different sites in production — browsers treat that cookie as third-party
// and increasingly restrict or drop it (Safari ITP, Firefox ETP, Chrome),
// even with SameSite=None; Secure set correctly. So the JWT is also kept
// client-side and sent as `Authorization: Bearer <token>` on every request
// (and as a `?token=` query param for WebSocket, which can't carry headers),
// which works regardless of third-party cookie policy.

const TOKEN_KEY = 'cw_token'
let authToken = localStorage.getItem(TOKEN_KEY) || null

export function setAuthToken(token) {
  authToken = token || null
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function authHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {}
}

export const API_BASE = import.meta.env.VITE_API_URL || ''
const BASE = `${API_BASE}/api`

export function wsUrl(path) {
  const base = import.meta.env.VITE_WS_URL
    // Accept the host either with or without a trailing /ws — every caller
    // already passes a path starting with /ws, so a configured value of
    // "wss://host/ws" would otherwise double up to "wss://host/ws/ws".
    ? import.meta.env.VITE_WS_URL.replace(/\/ws\/?$/, '').replace(/\/$/, '')
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

  if (!authToken) return `${base}${path}`
  return `${base}${path}${path.includes('?') ? '&' : '?'}token=${authToken}`
}

async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { ...authHeaders() },
  }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}${path}`, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`)
  }
  return data
}

const get  = (path)        => request('GET',    path)
const post = (path, body)  => request('POST',   path, body)
const patch= (path, body)  => request('PATCH',  path, body)
const del  = (path)        => request('DELETE', path)

// ── Auth ───────────────────────────────────────────────────────────────────
export const auth = {
  me:       ()               => get('/auth/me'),
  login:    (email, password) => post('/auth/login',    { email, password }),
  register: (name, email, password, penColor) => post('/auth/register', { name, email, password, penColor }),
  logout:   ()               => post('/auth/logout',   {}),
  updateMe: (updates)        => patch('/auth/me',       updates),
  deleteAccount: ()          => del('/auth/me'),
}

// ── Documents ──────────────────────────────────────────────────────────────
export const documents = {
  list:   (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString()
    return get(`/documents${qs ? `?${qs}` : ''}`)
  },
  create: (title)       => post('/documents',            { title }),
  get:    (id)          => get(`/documents/${id}`),
  update: (id, body)    => patch(`/documents/${id}`,     body),
  star:   (id)          => patch(`/documents/${id}/star`, {}),
  delete: (id)          => del(`/documents/${id}`),
}

// ── Comments ───────────────────────────────────────────────────────────────
export const comments = {
  list:    (docId)                  => get(`/documents/${docId}/comments`),
  create:  (docId, body, type = 'general', anchor = null) =>
    post(`/documents/${docId}/comments`, { body, type, anchor }),
  resolve: (docId, commentId)       => patch(`/documents/${docId}/comments/${commentId}/resolve`, {}),
  delete:  (docId, commentId)       => del(`/documents/${docId}/comments/${commentId}`),
}

// ── Notifications ──────────────────────────────────────────────────────────
export const notifications = {
  list:       ()   => get('/notifications'),
  markAllRead: ()  => patch('/notifications/read-all', {}),
  clearAll:   ()   => del('/notifications'),
  delete:     (id) => del(`/notifications/${id}`),
}
