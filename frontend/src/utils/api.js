// ── API Client ─────────────────────────────────────────────────────────────
// All requests go through the Vite dev proxy (/api → http://localhost:5000/api).
// Cookies (JWT) are included automatically via credentials: 'include'.

const BASE = '/api'

async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
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
  verifyEmail: (token)       => get(`/auth/verify-email/${token}`),
  resendVerification: (email) => post('/auth/resend-verification', { email }),
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

// ── AI ─────────────────────────────────────────────────────────────────────
export const ai = {
  rewrite: (text, instruction) => post('/ai/rewrite', { text, instruction }),
}
