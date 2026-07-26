import { useEffect, useState } from 'react'
import { MessageSquare, CornerDownRight, Check, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Avatar from './Avatar.jsx'
import { timeAgo } from '../utils/time.js'
import './CommentsPanel.css'

export default function CommentsPanel({ docId, pendingAnchor, onClearAnchor, className = '', demoMode = false, demoUser = null }) {
  const { comments, fetchComments, addComment, addReply, resolveComment } = useApp()
  const [draft, setDraft] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})
  // Demo Mode keeps its own in-memory comment thread — never touches the
  // backend, so refreshing the page resets it along with everything else.
  const [demoComments, setDemoComments] = useState([])

  // Fetch comments for this doc when it changes (skipped entirely in demo mode).
  // Editor.jsx already kicks this off in parallel with the document fetch, so
  // this only actually fires here if that hasn't happened yet — undefined vs.
  // an empty array distinguishes "not fetched" from "fetched, no comments".
  useEffect(() => {
    if (!demoMode && docId && comments[docId] === undefined) fetchComments(docId)
  }, [docId, demoMode, fetchComments, comments])

  const list = demoMode ? demoComments : (comments[docId] || [])
  const open = list.filter((c) => !c.resolved)
  const resolved = list.filter((c) => c.resolved)

  function submit(e) {
    e.preventDefault()
    if (!draft.trim()) return
    if (demoMode) {
      setDemoComments((prev) => [
        ...prev,
        {
          id: `demo-${Date.now()}`,
          author: demoUser,
          text: draft.trim(),
          anchor: pendingAnchor,
          resolved: false,
          replies: [],
          createdAt: new Date().toISOString(),
        },
      ])
    } else {
      addComment(docId, draft.trim(), pendingAnchor)
    }
    setDraft('')
    onClearAnchor?.()
  }

  function submitReply(commentId) {
    const text = replyDrafts[commentId]
    if (!text?.trim()) return
    if (demoMode) {
      setDemoComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: [
                  ...(c.replies || []),
                  { id: `demo-reply-${Date.now()}`, author: demoUser, text: text.trim(), createdAt: new Date().toISOString() },
                ],
              }
            : c
        )
      )
    } else {
      addReply(docId, commentId, text.trim())
    }
    setReplyDrafts((d) => ({ ...d, [commentId]: '' }))
  }

  function resolve(commentId) {
    if (demoMode) {
      setDemoComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, resolved: !c.resolved } : c)))
    } else {
      resolveComment(docId, commentId)
    }
  }

  return (
    <aside className={`comments-panel ${className}`}>
      <div className="comments-panel__header">
        <MessageSquare size={16} />
        <h3>Comments</h3>
      </div>

      <form className="comments-panel__form" onSubmit={submit}>
        {pendingAnchor && typeof pendingAnchor === 'string' && (
          <div className="comments-panel__anchor">
            On: "{pendingAnchor}"
            <button type="button" onClick={onClearAnchor} aria-label="Clear selection">
              <X size={12} />
            </button>
          </div>
        )}
        <textarea
          placeholder={pendingAnchor ? 'Comment on the selected text…' : 'Add a comment on the document…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
        />
        <button className="btn btn--primary btn--sm" type="submit" disabled={!draft.trim()}>
          Comment
        </button>
      </form>

      <div className="comments-panel__list">
        {open.length === 0 && resolved.length === 0 && (
          <p className="comments-panel__empty">No comments yet — select text to leave one inline.</p>
        )}

        {open.map((c) => (
          <CommentThread
            key={c.id}
            comment={c}
            onResolve={() => resolve(c.id)}
            replyDraft={replyDrafts[c.id] || ''}
            onReplyChange={(v) => setReplyDrafts((d) => ({ ...d, [c.id]: v }))}
            onReplySubmit={() => submitReply(c.id)}
          />
        ))}

        {resolved.length > 0 && (
          <>
            <p className="comments-panel__section-label">Resolved</p>
            {resolved.map((c) => (
              <CommentThread
                key={c.id}
                comment={c}
                onResolve={() => resolve(c.id)}
                replyDraft={replyDrafts[c.id] || ''}
                onReplyChange={(v) => setReplyDrafts((d) => ({ ...d, [c.id]: v }))}
                onReplySubmit={() => submitReply(c.id)}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  )
}

function CommentThread({ comment, onResolve, replyDraft, onReplyChange, onReplySubmit }) {
  return (
    <div className={`comment ${comment.resolved ? 'comment--resolved' : ''}`}>
      <div className="comment__head">
        <Avatar person={comment.author} size={24} />
        <div>
          <p className="comment__author">{comment.author.name}</p>
          <span className="mono comment__time">{timeAgo(comment.createdAt)}</span>
        </div>
        <button className="comment__resolve" onClick={onResolve} title={comment.resolved ? 'Reopen' : 'Resolve'}>
          <Check size={13} />
        </button>
      </div>
      {comment.anchor && typeof comment.anchor === 'string' && <p className="comment__anchor">on "{comment.anchor}"</p>}
      <p className="comment__text">{comment.text}</p>

      {(comment.replies || []).map((r) => (
        <div className="comment__reply" key={r.id}>
          <CornerDownRight size={12} />
          <Avatar person={r.author} size={20} />
          <div>
            <p className="comment__author">{r.author.name}</p>
            <p className="comment__text">{r.text}</p>
          </div>
        </div>
      ))}

      {!comment.resolved && (
        <form
          className="comment__reply-form"
          onSubmit={(e) => {
            e.preventDefault();
            onReplySubmit();
          }}
        >
          <input
            placeholder="Reply…"
            value={replyDraft}
            onChange={(e) => onReplyChange(e.target.value)}
          />
          <button
            className="btn btn--primary btn--sm"
            type="submit"
            disabled={!replyDraft?.trim()}
          >
            Reply
          </button>
        </form>
      )}
    </div>
  )
}
