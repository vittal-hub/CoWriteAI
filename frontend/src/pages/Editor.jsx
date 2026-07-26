import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Share2, MessageSquare, Download, Trash2, Bell, LogIn, UserPlus } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { documents as docsApi } from '../utils/api.js'
import EditorToolbar, { MODES } from '../components/EditorToolbar.jsx'
import RichEditor from '../components/RichEditor.jsx'
import DrawingCanvas from '../components/DrawingCanvas.jsx'
import LiveCursors from '../components/LiveCursors.jsx'
import VoiceBar from '../components/VoiceBar.jsx'
import AIRewriteBar from '../components/AIRewriteBar.jsx'
import CommentsPanel from '../components/CommentsPanel.jsx'
import PresenceStack from '../components/PresenceStack.jsx'
import ShareModal from '../components/ShareModal.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import UserProfileMenu from '../components/UserProfileMenu.jsx'
import DemoBanner from '../components/DemoBanner.jsx'
import { useStickyHeader } from '../utils/useStickyHeader.js'
import { useDocumentSocket } from '../hooks/useDocumentSocket.js'
import { rewriteTextToInsertableHtml } from '../utils/textFormat.js'
import { DEMO_TITLE, DEMO_CONTENT, DEMO_PROFILE } from '../data/demoContent.js'
import './Editor.css'

const PEN_COLORS = ['var(--indigo)', 'var(--coral)', 'var(--teal)', 'var(--amber)', 'var(--violet)']
const DEMO_LOCKED_TITLE = 'Sign in to use this feature'

export default function EditorPage({ demoMode = false }) {
  const { docId } = useParams()
  const navigate = useNavigate()
  const { documents, currentUser, updateDocumentContent, renameDocument, deleteDocument, fetchDocuments, fetchComments } = useApp()
  const { isSticky, isScrollingUp } = useStickyHeader(15)

  // Demo Mode never has a real authenticated user — DEMO_PROFILE stands in for
  // display/identity purposes (avatar, cursor color, comment authorship) only;
  // it's never sent anywhere.
  const effectiveUser = demoMode ? DEMO_PROFILE : currentUser

  const [loading, setLoading] = useState(!demoMode)
  const [currentDoc, setCurrentDoc] = useState(
    demoMode ? { id: 'demo', title: DEMO_TITLE, owner: DEMO_PROFILE.id } : null
  )

  const [mode, setMode] = useState(MODES.TEXT)
  const [isEraser, setIsEraser] = useState(false)
  const [content, setContent] = useState(demoMode ? DEMO_CONTENT : '<p></p>')
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState(null)
  const [pendingAnchor, setPendingAnchor] = useState(null)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [strokes, setStrokesRaw] = useState([])
  const [strokeHistory, setStrokeHistory] = useState([[]])
  const [historyStep, setHistoryStep] = useState(0)

  function setStrokes(newStrokes) {
    setStrokesRaw((prev) => {
      const next = typeof newStrokes === 'function' ? newStrokes(prev) : newStrokes
      setStrokeHistory((currHistory) => {
        const newHistory = currHistory.slice(0, historyStep + 1)
        newHistory.push(next)
        return newHistory
      })
      setHistoryStep((step) => step + 1)
      return next
    })
  }

  function undoStrokes() {
    if (historyStep > 0) {
      const newStep = historyStep - 1
      setHistoryStep(newStep)
      setStrokesRaw(strokeHistory[newStep])
    }
  }

  function redoStrokes() {
    if (historyStep < strokeHistory.length - 1) {
      const newStep = historyStep + 1
      setHistoryStep(newStep)
      setStrokesRaw(strokeHistory[newStep])
    }
  }

  const [activePen, setActivePen] = useState(PEN_COLORS[effectiveUser?.penIndex || 0])
  const [title, setTitle] = useState(demoMode ? DEMO_TITLE : '')
  const [rewriteSessionKey, setRewriteSessionKey] = useState(0)

  const editorRef = useRef(null)
  const canvasRef = useRef(null)
  const saveTimer = useRef(null)
  const cursorThrottle = useRef(null)
  const loadedDocIdRef = useRef(null)
  const [, forceRerender] = useState(0)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleSelectionChange({ text, from, to }) {
    setSelectedText(text)
    setSelectionRange(from === to ? null : { from, to })
  }

  function clearSelection() {
    setSelectedText('')
    setSelectionRange(null)
  }

  function handleSetMode(nextMode) {
    if (nextMode === MODES.AI) {
      setRewriteSessionKey((k) => k + 1)
    }
    setMode(nextMode)
  }

  function handleDeleteDocument() {
    if (demoMode) return
    setShowDeleteConfirm(true)
  }

  function confirmDeleteDocument() {
    if (demoMode) return
    deleteDocument(docId)
    navigate('/app')
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (downloadMenuOpen && !e.target.closest('.editor-header__dropdown')) {
        setDownloadMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [downloadMenuOpen])

  // Fetch / load initial document content when docId changes
  useEffect(() => {
    // Demo Mode content/title/strokes are already seeded in useState above.
    if (demoMode) return

    // Already loaded this doc — don't re-fetch.
    if (loadedDocIdRef.current === docId && currentDoc) return

    let isMounted = true
    // Dashboard's list view has no `strokes`, so it's only used for an instant
    // title/content preview here — the fetch below always still runs to load them.
    const contextDoc = (documents || []).find((d) => d.id === docId)
    if (contextDoc) {
      setCurrentDoc(contextDoc)
      setContent(contextDoc.content || '<p></p>')
      setTitle(contextDoc.title || 'Untitled document')
      setLoading(false)
    } else {
      setLoading(true)
    }

    // Fired in parallel with the document fetch below rather than waiting for
    // CommentsPanel to mount (which only happens once `loading` clears) — that
    // used to serialize "load doc, then load comments" into one long chain.
    fetchComments(docId)

    docsApi.get(docId)
      .then(({ document: raw }) => {
        if (!isMounted) return
        loadedDocIdRef.current = docId
        const d = {
          id: raw.id || raw._id,
          title: raw.title || 'Untitled document',
          content: raw.content || '<p></p>',
          owner: raw.owner?._id || raw.owner || '',
          sharedWith: (raw.collaborators || []).map((c) => ({
            id: c.user?._id || c.user,
            name: c.user?.name || '',
            email: c.user?.email || '',
          })),
          starred: raw.starred || false,
          updatedAt: raw.updatedAt || new Date().toISOString(),
        }
        setCurrentDoc(d)
        setContent(d.content)
        setTitle(d.title)

        // Load strokes if available
        if (raw.strokes && raw.strokes.length > 0) {
          setStrokesRaw(raw.strokes)
          setStrokeHistory([[], raw.strokes])
          setHistoryStep(1)
        } else {
          setStrokesRaw([])
          setStrokeHistory([[]])
          setHistoryStep(0)
        }
      })
      .catch((err) => {
        console.error('[Editor] Fetch doc error:', err)
        if (isMounted) setCurrentDoc(null)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  const { activePresence, emit, on } = useDocumentSocket(docId)

  // Handle remote updates
  useEffect(() => {
    const unbindUpdate = on('doc:update', (payload) => {
      setContent(payload.content)
    })
    const unbindStroke = on('draw:stroke', (payload) => {
      setStrokes((prev) => [...prev, payload.stroke])
    })
    const unbindClear = on('draw:clear', () => {
      setStrokesRaw([])
      setStrokeHistory([[]])
      setHistoryStep(0)
    })
    const unbindCollabs = on('doc:collaborators_updated', () => {
      fetchDocuments()
    })
    return () => {
      unbindUpdate()
      unbindStroke()
      unbindClear()
      unbindCollabs()
    }
  }, [on, fetchDocuments])

  const others = useMemo(
    () => (activePresence || []).filter((p) => p.id !== effectiveUser?.id),
    [activePresence, effectiveUser?.id]
  )

  // Broadcasts the real TipTap text-cursor position (not mouse position) so
  // remote collaborators see exactly where each person is editing — this
  // fires from RichEditor on every selection change (typing, arrow keys,
  // clicks, text selection). Throttled to avoid flooding the socket while
  // typing quickly; the latest position always wins once the throttle clears.
  const pendingCursorRef = useRef(null)

  const handleCursorMove = (coords) => {
    pendingCursorRef.current = coords
    if (cursorThrottle.current) return
    cursorThrottle.current = setTimeout(() => {
      cursorThrottle.current = null
      const canvas = canvasRef.current
      const pending = pendingCursorRef.current
      if (!canvas || !pending) return
      const rect = canvas.getBoundingClientRect()
      const x = pending.left - rect.left
      const y = pending.top - rect.top + canvas.scrollTop
      emit('presence:cursor', { cursor: { x, y } })
    }, 60)
  }

  if (loading) {
    return (
      <div className="auth-loading">
        <span className="auth-spinner" />
      </div>
    )
  }

  if (!currentDoc) {
    return (
      <div className="editor-missing">
        <p>This document isn't available — it may have been deleted.</p>
        <button className="btn btn--primary" onClick={() => navigate('/app')}>
          Back to documents
        </button>
      </div>
    )
  }

  function handleContentChange(html) {
    setContent(html)
    if (demoMode) return // in-memory only — no socket broadcast, no cloud save
    emit('doc:update', { content: html, version: Date.now() })
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => updateDocumentContent(docId, html), 500)
  }

  function handleTitleBlur() {
    if (demoMode) return
    renameDocument(docId, title.trim() || 'Untitled document')
  }

  function insertDictation(text, speaker) {
    const editor = editorRef.current
    if (!editor) return
    const label = speaker ? `<strong>${speaker.name}:</strong> ` : ''
    // .focus() (no arg) restores the last known cursor position instead of
    // forcing the document end, so dictation lands wherever the user was
    // last editing — including the middle of existing text.
    editor.chain().focus().insertContent(`<p>${label}${text}</p>`).run()
  }

  function acceptRewrite(suggestion) {
    const editor = editorRef.current
    if (!editor) return
    const html = rewriteTextToInsertableHtml(suggestion)
    if (!html) return
    if (selectionRange && selectionRange.from !== undefined && selectionRange.from !== selectionRange.to) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: selectionRange.from, to: selectionRange.to })
        .insertContent(html)
        .run()
    } else {
      editor.chain().focus().deleteSelection().insertContent(html).run()
    }
    clearSelection()
  }

  function downloadAsDOCX() {
    const header = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title></head><body>';
    const footer = '</body></html>';
    const sourceHTML = header + content + footer;

    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.trim() || 'Untitled document'}.doc`
    a.click()
    URL.revokeObjectURL(url)
    setDownloadMenuOpen(false)
  }

  async function downloadAsPDF() {
    const element = document.querySelector('.rich-editor .ProseMirror')
    if (!element) return
    const opt = {
      margin: 10,
      filename: `${title.trim() || 'Untitled document'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    // html2pdf.js bundles jsPDF + html2canvas (~15MB combined pre-minification) —
    // loading it eagerly added it to every editor page load even though most
    // sessions never click "Download PDF". Lazy-loading it here keeps it out
    // of the main bundle entirely.
    const { default: html2pdf } = await import('html2pdf.js')
    html2pdf().set(opt).from(element).save()
    setDownloadMenuOpen(false)
  }



  return (
    <div className="editor-page">
      {demoMode && <DemoBanner />}
      <header
        className={`editor-header ${isSticky ? 'header--glass-sticky' : ''} ${
          isSticky && !isScrollingUp ? 'header--hidden' : ''
        }`}
      >
        <button
          className="btn btn--icon"
          onClick={() => navigate(demoMode ? '/' : '/app')}
          aria-label={demoMode ? 'Back to home' : 'Back to documents'}
        >
          <ArrowLeft size={18} />
        </button>
        <input
          className="editor-header__title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          readOnly={demoMode}
          title={demoMode ? DEMO_LOCKED_TITLE : undefined}
        />
        <div className="editor-header__right">
          <PresenceStack people={others} size={28} />

          <div className="editor-header__dropdown">
            <button
              className="btn btn--ghost btn--sm hide-mobile"
              onClick={() => !demoMode && setDownloadMenuOpen(!downloadMenuOpen)}
              disabled={demoMode}
              title={demoMode ? DEMO_LOCKED_TITLE : undefined}
            >
              <Download size={14} /> Download
            </button>

            {downloadMenuOpen && (
              <div className="editor-header__dropdown-menu">
                <button onClick={downloadAsDOCX}>DOCX</button>
                <button onClick={downloadAsPDF}>PDF</button>
              </div>
            )}
          </div>

          <button
            className="btn btn--ghost btn--sm hide-mobile"
            onClick={() => !demoMode && setShareOpen(true)}
            disabled={demoMode}
            title={demoMode ? DEMO_LOCKED_TITLE : undefined}
          >
            <Share2 size={14} /> Share
          </button>

          {(demoMode || currentDoc.owner === currentUser?.id) && (
            <button
              className="btn btn--ghost btn--sm hide-mobile"
              onClick={handleDeleteDocument}
              disabled={demoMode}
              title={demoMode ? DEMO_LOCKED_TITLE : undefined}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}

          <button
            className={`btn btn--icon ${commentsOpen ? 'editor-header__comments--active' : ''}`}
            onClick={() => setCommentsOpen((o) => !o)}
            aria-label="Toggle comments"
          >
            <MessageSquare size={18} />
          </button>
          <ThemeToggle />

          {demoMode ? (
            <>
              <button className="btn btn--icon" disabled title={DEMO_LOCKED_TITLE} aria-label="Notifications (sign in required)">
                <Bell size={19} />
              </button>
              <Link to="/login" className="btn btn--ghost btn--sm hide-mobile">
                <LogIn size={14} /> Sign in
              </Link>
              <Link to="/signup" className="btn btn--primary btn--sm">
                <UserPlus size={14} /> Create account
              </Link>
            </>
          ) : (
            <>
              <NotificationBell />
              <UserProfileMenu />
            </>
          )}
        </div>
      </header>

      <EditorToolbar
        mode={mode}
        setMode={handleSetMode}
        editor={editorRef.current}
        isEraser={isEraser}
        setIsEraser={setIsEraser}
        onClearDrawing={() => {
          setStrokesRaw([])
          setStrokeHistory([[]])
          setHistoryStep(0)
          emit('draw:clear', {})
        }}
        penColors={PEN_COLORS}
        activePen={activePen}
        setActivePen={setActivePen}
        onUndoStrokes={undoStrokes}
        onRedoStrokes={redoStrokes}
      />

      {mode === MODES.MIC && (
        <VoiceBar onInsert={insertDictation} onClose={() => setMode(MODES.TEXT)} />
      )}
      {mode === MODES.AI && (
        <AIRewriteBar
          selectedText={selectedText}
          selectionRange={selectionRange}
          onAccept={acceptRewrite}
          onClearSelection={clearSelection}
          onClose={() => setMode(MODES.TEXT)}
          rewriteSessionKey={rewriteSessionKey}
          demoMode={demoMode}
        />
      )}

      <div className="editor-body">
        <div className="editor-canvas" ref={canvasRef}>
          <RichEditor
            content={content}
            onChange={handleContentChange}
            onSelectionChange={handleSelectionChange}
            onCursorMove={handleCursorMove}
            editorRef={editorRef}
            onReady={() => forceRerender((n) => n + 1)}
          />
          <DrawingCanvas
            active={mode === MODES.PENCIL}
            isEraser={isEraser}
            color={activePen}
            strokes={strokes}
            setStrokes={setStrokes}
            onDrawStroke={(stroke) => emit('draw:stroke', { stroke })}
          />
          <LiveCursors people={others} canvasRef={canvasRef} />
        </div>

        <div className={`editor-comments-wrapper ${commentsOpen ? '' : 'editor-comments-wrapper--closed'}`}>
          <CommentsPanel
            className={commentsOpen ? '' : 'comments-panel--closed'}
            docId={docId}
            pendingAnchor={pendingAnchor || (selectedText && mode === MODES.TEXT ? selectedText.slice(0, 60) : null)}
            onClearAnchor={() => setPendingAnchor(null)}
            demoMode={demoMode}
            demoUser={DEMO_PROFILE}
          />
        </div>
      </div>

      {shareOpen && <ShareModal doc={currentDoc} onClose={() => setShareOpen(false)} />}

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete document?</h3>
            <p>This action cannot be undone.</p>
            <div className="delete-confirm-buttons">
              <button className="btn btn--ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn--primary btn--danger" onClick={confirmDeleteDocument}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
