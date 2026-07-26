import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, Plus, FileText, Star, Users, FolderOpen,
  ArrowDownUp, ChevronsLeft, ChevronsRight, X, Link2
} from 'lucide-react'
import { useApp, normaliseDoc } from '../context/AppContext.jsx'
import DocCard from '../components/DocCard.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import UserProfileMenu from '../components/UserProfileMenu.jsx'
import JoinModal from '../components/JoinModal.jsx'
import { documents as docsApi } from '../utils/api.js'
import { useStickyHeader } from '../utils/useStickyHeader.js'
import './Dashboard.css'

const FILTERS = [
  { id: 'all',     label: 'All documents',  icon: FolderOpen },
  { id: 'owned',   label: 'Owned by me',    icon: FileText },
  { id: 'shared',  label: 'Shared with me', icon: Users },
  { id: 'starred', label: 'Starred',        icon: Star },
]

// Map dashboard sort values to backend allowedSorts
const SORT_MAP = {
  updated: '-lastEditedAt',
  created: '-createdAt',
  title:   'title',
}

export default function Dashboard() {
  const { documents: ctxDocs, profile, createDocument, currentUser } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sort, setSort] = useState('updated')
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isSticky, isScrollingUp } = useStickyHeader(20)

  const [displayDocs, setDisplayDocs] = useState([])
  const [loading, setLoading] = useState(false)

  // ── Debounce the search query (250 ms) to avoid flooding the server ─────
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => clearTimeout(id)
  }, [query])

  // Read inside the effect below via a ref (not a dependency) — it only backs
  // the error-fallback path and shouldn't itself trigger a re-fetch.
  const ctxDocsRef = useRef(ctxDocs)
  ctxDocsRef.current = ctxDocs

  // ── Server-side fetch for filter + query + sort ──────────────────────────
  // Deliberately does NOT depend on ctxDocs: a create/delete/star/rename
  // already updates context optimistically (see AppContext), and refetching
  // the whole list from the server every time that array's reference changes
  // would re-introduce the exact network round-trip the optimistic update was
  // meant to avoid — undoing it and making the grid feel slow to update. The
  // effect below reconciles those optimistic changes into displayDocs locally
  // instead. A real server round-trip only happens when the filter/search/
  // sort inputs themselves change.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = {
          scope: filter,
          sort:  SORT_MAP[sort] || '-lastEditedAt',
        }
        if (debouncedQuery) params.q = debouncedQuery
        const { documents: raw } = await docsApi.list(params)
        if (cancelled) return
        const normalised = raw.map((d) => normaliseDoc(d))
        setDisplayDocs(normalised)
      } catch (err) {
        console.error('[dashboard] list docs failed', err)
        if (!cancelled) setDisplayDocs(ctxDocsRef.current)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [filter, debouncedQuery, sort])

  // ── Reconcile optimistic context mutations (delete/star/rename) into the
  // locally-fetched, filtered list — no network request, so the grid updates
  // the instant AppContext's optimistic update happens instead of waiting on
  // a full server round-trip.
  useEffect(() => {
    setDisplayDocs((prev) => {
      const ctxById = new Map(ctxDocs.map((d) => [d.id, d]))
      let changed = false
      const next = []
      for (const d of prev) {
        const match = ctxById.get(d.id)
        if (!match) { changed = true; continue } // deleted out of context
        if (match.starred !== d.starred || match.title !== d.title || match.updatedAt !== d.updatedAt) {
          changed = true
          next.push({ ...d, starred: match.starred, title: match.title, updatedAt: match.updatedAt })
        } else {
          next.push(d)
        }
      }
      return changed ? next : prev
    })
  }, [ctxDocs])

  const filtered = useMemo(() => {
    const ownerId = profile?.id ?? currentUser?.id
    let list = [...displayDocs]

    if (filter === 'owned')   list = list.filter((d) => d.owner === ownerId)
    if (filter === 'shared')  list = list.filter((d) => d.owner !== ownerId)
    if (filter === 'starred') list = list.filter((d) => !!d.starred)

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((d) => {
        const t = String(d.title || '').toLowerCase()
        const p = String(d.preview || '').toLowerCase()
        return t.includes(q) || p.includes(q)
      })
    }

    list.sort((a, b) => {
      if (sort === 'updated') return new Date(b.updatedAt) - new Date(a.updatedAt)
      if (sort === 'created') return new Date(b.createdAt) - new Date(a.createdAt)
      if (sort === 'title')   return String(a.title || '').localeCompare(String(b.title || ''))
      return 0
    })
    return list
  }, [displayDocs, filter, query, sort, profile?.id, currentUser?.id])

  async function handleNew() {
    const id = await createDocument('Untitled document')
    if (id) navigate(`/doc/${id}`)
  }

  function pickFilter(id) {
    setFilter(id)
    setSidebarOpen(false)
  }

  function handleMenuBtn() {
    // On mobile: open the overlay sidebar
    // On desktop: toggle collapse
    setSidebarOpen((o) => !o)
    setSidebarCollapsed((c) => !c)
  }

  return (
    <div className={`dash ${sidebarOpen ? 'dash--sidebar-open' : ''} ${sidebarCollapsed ? 'dash--sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="dash__overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className="dash__sidebar">
        <div className="dash__sidebar-top">
          <Link to="/" className="dash__brand-btn" aria-label="Go to home">
            <span className="dash__brand-mark">CW</span>
            <span className="dash__brand-label">CoWriteAI</span>
          </Link>
          <button
            className="btn btn--icon dash__menu-btn-sidebar"
            onClick={handleMenuBtn}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>

        <button className="btn btn--primary dash__new" onClick={handleNew}>
          <Plus size={sidebarCollapsed ? 24 : 16} />
          <span className="dash__new-label">New document</span>
        </button>

        <nav className="dash__filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`dash__filter ${filter === f.id ? 'dash__filter--active' : ''}`}
              onClick={() => pickFilter(f.id)}
              title={f.label}
            >
              <f.icon size={16} />
              <span className="dash__filter-label">{f.label}</span>
            </button>
          ))}
          <button
            className="dash__filter dash__join-btn"
            onClick={() => {
              setJoinModalOpen(true)
              setSidebarOpen(false)
            }}
            title="Join by Link & Password"
          >
            <Link2 size={16} />
            <span className="dash__filter-label">Join by Link</span>
          </button>
        </nav>
      </aside>

      <main className="dash__main">
        <header
          className={`dash__topbar ${isSticky ? 'header--glass-sticky' : ''} ${
            isSticky && !isScrollingUp ? 'header--hidden' : ''
          }`}
        >
          <div className="dash__search">
            <Search size={16} className="dash__search-icon" />
            <input
              type="search"
              placeholder="Search documents by title or content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {loading && <span className="auth-spinner dash__search-spinner" style={{ width: 14, height: 14 }} />}
          </div>

          <div className="dash__topbar-right">
            <div className="dash__sort">
              <ArrowDownUp size={14} />
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="updated">Last updated</option>
                <option value="created">Date created</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>

            <ThemeToggle />
            <NotificationBell />
            <UserProfileMenu />
          </div>
        </header>

        <h1 className="dash__heading">{FILTERS.find((f) => f.id === filter)?.label}</h1>

        {loading && filtered.length === 0 ? (
          <div className="dash__empty">
            <span className="auth-spinner" style={{ width: 26, height: 26 }} />
            <p>Searching…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="dash__empty">
            <FileText size={30} strokeWidth={1.4} />
            {debouncedQuery ? (
              <>
                <p>No documents match <strong>“{debouncedQuery}”</strong>.</p>
                <button className="btn btn--ghost" onClick={() => setQuery('')}>
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p>No documents match here yet.</p>
                <button className="btn btn--ghost" onClick={handleNew}>
                  <Plus size={15} /> Create one
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="dash__grid">
            {filtered.map((doc) => (
              <DocCard doc={doc} key={doc.id} />
            ))}
          </div>
        )}
      </main>

      {joinModalOpen && <JoinModal onClose={() => setJoinModalOpen(false)} />}
    </div>
  )
}
