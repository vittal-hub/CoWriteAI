import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react'
import {
  auth as authApi,
  documents as docsApi,
  notifications as notifsApi,
  comments as commentsApi,
  API_BASE,
  wsUrl,
} from '../utils/api.js'

const AppContext = createContext(null)

// ── theme helpers ──────────────────────────────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else if (theme === 'light') {
    root.removeAttribute('data-theme')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
  }
}

function loadTheme() {
  return localStorage.getItem('cna_theme') || 'system'
}

function loadEditorFontSize() {
  return localStorage.getItem('cna_editor_font_size') || '16'
}

// ── normalise a document from the API into the flat shape the UI expects ──
export function normaliseDoc(raw) {
  const ownerId = raw.owner?._id ?? raw.owner ?? ''
  const collaborators = raw.collaborators ?? []
  const sharedWith = collaborators.map((c) => {
    const u = c.user ?? {}
    return {
      id: u._id ?? u,
      name: u.name ?? '',
      email: u.email ?? '',
      penIndex: 0,
      initials: (u.name ?? '?')[0]?.toUpperCase() ?? '?',
      status: c.status ?? 'accepted',
      permission: c.permission ?? 'edit',
    }
  })

  const rawContent = typeof raw.content === 'string' ? raw.content : '<p></p>'
  const previewText = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)

  return {
    id: raw._id ?? raw.id,
    title: raw.title ?? 'Untitled',
    owner: ownerId,
    ownerName: raw.owner?.name ?? '',
    updatedAt: raw.lastEditedAt ?? raw.updatedAt ?? new Date().toISOString(),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    sharedWith,
    starred: raw.starred ?? false,
    preview: raw.preview ?? previewText,
    content: rawContent,
  }
}

// ── normalise a notification ───────────────────────────────────────────────
function normaliseNotif(raw) {
  return {
    id: raw._id ?? raw.id,
    type: raw.type ?? 'edit',
    text: raw.message ?? raw.text ?? '',
    doc: raw.document?._id ?? raw.document ?? null,
    read: raw.read ?? false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  }
}

// ── normalise a comment ────────────────────────────────────────────────────
function normaliseComment(raw) {
  const author = raw.author ?? {}
  // Normalise anchor to a string or null (backend may send an object with a `quote`)
  let anchor = raw.anchor ?? null
  if (anchor && typeof anchor !== 'string') {
    anchor = anchor.quote ?? null
  }
  return {
    id: raw._id ?? raw.id,
    author: {
      id: author._id ?? author,
      name: author.name ?? 'Unknown',
      email: author.email ?? '',
      penIndex: 0,
      initials: (author.name ?? '?')[0]?.toUpperCase() ?? '?',
    },
    text: raw.body ?? raw.text ?? '',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    anchor,
    resolved: raw.resolved ?? false,
    replies: [],  // backend returns flat; replies are child comments
  }
}

// ── Build a profile object from an API user ────────────────────────────────
function buildProfile(user) {
  return {
    id: user._id ?? user.id,
    name: user.name ?? '',
    email: user.email ?? '',
    penIndex: user.penIndex ?? 0,
    initials: (user.name ?? 'U')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? '',
  }
}

// ── Provider ───────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  // auth
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // theme
  const [theme, setThemeState] = useState(loadTheme)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('cna_theme', theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((t) => setThemeState(t), [])

  // Applied via a CSS custom property that RichEditor.css reads.
  const [editorFontSize, setEditorFontSizeState] = useState(loadEditorFontSize)

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-font-size', `${editorFontSize}px`)
    localStorage.setItem('cna_editor_font_size', editorFontSize)
  }, [editorFontSize])

  const setEditorFontSize = useCallback((size) => setEditorFontSizeState(size), [])

  // data
  const [documents, setDocuments] = useState([])
  const [comments, setComments] = useState({})
  const [notifications, setNotifications] = useState([])
  const [notifyPrefs, setNotifyPrefs] = useState({
    email: true, comments: true, shares: true, activity: false,
  })

  // ── Session restore on mount ───────────────────────────────────────────────
  useEffect(() => {
    authApi.me()
      .then(({ user }) => {
        setProfile(buildProfile(user))
        setIsAuthenticated(true)
      })
      .catch(() => { /* no valid session */ })
      .finally(() => setAuthLoading(false))
  }, [])

  // ── Fetch data after login ─────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      const { documents: raw } = await docsApi.list()
      setDocuments(raw.map(normaliseDoc))
    } catch (err) {
      console.error('[documents] fetch failed', err)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const { notifications: raw } = await notifsApi.list()
      setNotifications(raw.map(normaliseNotif))
    } catch (err) {
      console.error('[notifications] fetch failed', err)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setDocuments([])
      setNotifications([])
      setComments({})
      return
    }
    fetchDocuments()
    fetchNotifications()

    // Global user socket for real-time notification push without page reload
    let ws
    try {
      ws = new WebSocket(wsUrl('/ws'))
      ws.onmessage = (event) => {
        try {
          const { type } = JSON.parse(event.data)
          // Backend pushes this on any new notification (see utils/notify.js).
          if (type === 'notification:new') {
            fetchNotifications()
            fetchDocuments()
          }
        } catch {}
      }
    } catch {}

    return () => {
      if (ws) ws.close()
    }
  }, [isAuthenticated, fetchDocuments, fetchNotifications])

  // ── Auth actions ───────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setAuthError(null)
    try {
      const { user } = await authApi.login(email, password)
      setProfile(buildProfile(user))
      setIsAuthenticated(true)
      return true
    } catch (err) {
      setAuthError(err.message)
      return false
    }
  }, [])

  // Registering doesn't log the user in — email verification is required first.
  const register = useCallback(async (name, email, password, penColor) => {
    setAuthError(null)
    try {
      const { message } = await authApi.register(name, email, password, penColor)
      return { ok: true, message }
    } catch (err) {
      setAuthError(err.message)
      return { ok: false, message: err.message }
    }
  }, [])

  const verifyEmail = useCallback(async (token) => {
    try {
      const { user } = await authApi.verifyEmail(token)
      setProfile(buildProfile(user))
      setIsAuthenticated(true)
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  }, [])

  const resendVerification = useCallback(async (email) => {
    try {
      const { message } = await authApi.resendVerification(email)
      return { ok: true, message }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch {}
    setIsAuthenticated(false)
    setProfile(null)
    setDocuments([])
    setNotifications([])
    setComments({})
  }, [])

  const updateProfile = useCallback(async (updates) => {
    setProfile((p) => ({ ...p, ...updates }))
    try {
      const payload = {}
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.avatarUrl !== undefined) payload.avatarUrl = updates.avatarUrl
      if (Object.keys(payload).length) await authApi.updateMe(payload)
    } catch (err) {
      console.error('[profile] update failed', err)
    }
  }, [])

  // ── Document actions ───────────────────────────────────────────────────────
  const createDocument = useCallback(async (title) => {
    try {
      const { document: raw } = await docsApi.create(title)
      const doc = normaliseDoc(raw)
      setDocuments((prev) => [doc, ...prev])
      return doc.id
    } catch (err) {
      console.error('[documents] create failed', err)
      return null
    }
  }, [])

  const deleteDocument = useCallback(async (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    try {
      await docsApi.delete(id)
    } catch (err) {
      console.error('[documents] delete failed', err)
      fetchDocuments()
    }
  }, [fetchDocuments])

  const updateDocumentContent = useCallback(async (id, content) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, content, updatedAt: new Date().toISOString() } : d
      )
    )
    try {
      await docsApi.update(id, { content })
    } catch (err) {
      console.error('[documents] update content failed', err)
    }
  }, [])

  const renameDocument = useCallback(async (id, title) => {
    setDocuments((prev) => prev.map((d) => d.id === id ? { ...d, title } : d))
    try {
      await docsApi.update(id, { title })
    } catch (err) {
      console.error('[documents] rename failed', err)
    }
  }, [])

  const toggleStar = useCallback(async (id) => {
    setDocuments((prev) =>
      prev.map((d) => d.id === id ? { ...d, starred: !d.starred } : d)
    )
    try {
      await docsApi.star(id)
    } catch (err) {
      console.error('[documents] star failed', err)
      setDocuments((prev) =>
        prev.map((d) => d.id === id ? { ...d, starred: !d.starred } : d)
      )
    }
  }, [])

  const shareDocument = useCallback(() => {
    // ShareModal posts directly to the API; refresh after a short delay
    setTimeout(() => fetchDocuments(), 1000)
  }, [fetchDocuments])

  const acceptInvite = useCallback(async (docId) => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${docId}/accept-invite`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        fetchDocuments()
        fetchNotifications()
      }
    } catch (err) {
      console.error('[invite] accept failed', err)
    }
  }, [fetchDocuments, fetchNotifications])

  const declineInvite = useCallback(async (docId) => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${docId}/decline-invite`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        fetchDocuments()
        fetchNotifications()
      }
    } catch (err) {
      console.error('[invite] decline failed', err)
    }
  }, [fetchDocuments, fetchNotifications])

  // ── Comment actions ────────────────────────────────────────────────────────
  const fetchComments = useCallback(async (docId) => {
    try {
      const { comments: raw } = await commentsApi.list(docId)
      setComments((prev) => ({ ...prev, [docId]: raw.map(normaliseComment) }))
    } catch (err) {
      console.error('[comments] fetch failed', err)
    }
  }, [])

  const addComment = useCallback(async (docId, text, anchor) => {
    try {
      // Ensure anchor is a string or null
      let safeAnchor = anchor ?? null
      if (safeAnchor && typeof safeAnchor !== 'string') {
        safeAnchor = safeAnchor.quote ?? null
      }
      const { comment: raw } = await commentsApi.create(docId, text, 'general', safeAnchor)
      const comment = normaliseComment(raw)
      setComments((prev) => ({
        ...prev,
        [docId]: [...(prev[docId] || []), comment],
      }))
    } catch (err) {
      console.error('[comments] create failed', err)
    }
  }, [])

  const addReply = useCallback(async (docId, parentId, text) => {
    // Backend stores replies as child comments; add optimistically with parent info
    try {
      const { comment: raw } = await commentsApi.create(docId, text, 'general', null)
      const reply = normaliseComment(raw)
      setComments((prev) => ({
        ...prev,
        [docId]: (prev[docId] || []).map((c) =>
          c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c
        ),
      }))
    } catch (err) {
      console.error('[comments] reply failed', err)
    }
  }, [])

  const resolveComment = useCallback(async (docId, commentId) => {
    setComments((prev) => ({
      ...prev,
      [docId]: (prev[docId] || []).map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c
      ),
    }))
    try {
      await commentsApi.resolve(docId, commentId)
    } catch (err) {
      console.error('[comments] resolve failed', err)
    }
  }, [])

  // ── Notification actions ───────────────────────────────────────────────────
  const markNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await notifsApi.markAllRead()
    } catch (err) {
      console.error('[notifications] mark read failed', err)
    }
  }, [])

  const clearNotifications = useCallback(async () => {
    setNotifications([])
    try {
      await notifsApi.clearAll()
    } catch (err) {
      console.error('[notifications] clear failed', err)
    }
  }, [])

  const deleteNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await notifsApi.delete(id)
    } catch (err) {
      console.error('[notifications] delete failed', err)
    }
  }, [])

  const updateNotifyPrefs = useCallback((prefs) => {
    setNotifyPrefs((p) => ({ ...p, ...prefs }))
  }, [])

  const deleteAccount = useCallback(async () => {
    try {
      await authApi.deleteAccount()
      // Clear all state same as logout after success so local state is clean
      setIsAuthenticated(false)
      setProfile(null)
      setDocuments([])
      setNotifications([])
      setComments({})
      return true
    } catch (err) {
      console.error('[auth] delete account failed', err)
      return false
    }
  }, [])

  // ── Context value ──────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      // auth
      isAuthenticated,
      authLoading,
      profile,
      authError,
      login,
      logout,
      register,
      verifyEmail,
      resendVerification,
      updateProfile,
      deleteAccount,
      // theme
      theme,
      setTheme,
      editorFontSize,
      setEditorFontSize,
      currentUser: profile, // legacy alias some components expect
      // docs
      documents,
      comments,
      notifications,
      notifyPrefs,
      updateNotifyPrefs,
      createDocument,
      deleteDocument,
      updateDocumentContent,
      renameDocument,
      toggleStar,
      shareDocument,
      acceptInvite,
      declineInvite,
      fetchComments,
      addComment,
      addReply,
      resolveComment,
      markNotificationsRead,
      clearNotifications,
      deleteNotification,
      fetchDocuments,
      fetchNotifications,
    }),
    [
      isAuthenticated, authLoading, profile, authError,
      login, logout, register, verifyEmail, resendVerification, updateProfile, deleteAccount,
      theme, setTheme, editorFontSize, setEditorFontSize,
      documents, comments, notifications,
      notifyPrefs, updateNotifyPrefs,
      createDocument, deleteDocument, updateDocumentContent,
      renameDocument, toggleStar, shareDocument, acceptInvite, declineInvite,
      fetchComments, addComment, addReply, resolveComment,
      markNotificationsRead, clearNotifications, deleteNotification, fetchDocuments, fetchNotifications,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
