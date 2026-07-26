import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Share2, Trash2, MoreHorizontal } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import PresenceStack from './PresenceStack.jsx'
import ShareModal from './ShareModal.jsx'
import { timeAgo } from '../utils/time.js'
import './DocCard.css'

export default function DocCard({ doc }) {
  const { toggleStar, deleteDocument, currentUser } = useApp()
  const [shareOpen, setShareOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const navigate = useNavigate()

  // owner is a string ID (normalised in AppContext)
  const isOwner = doc.owner === currentUser?.id
  const active = doc.sharedWith || []

  function handleDelete(e) {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  function confirmDelete(e) {
    e.stopPropagation()
    deleteDocument(doc.id)
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <div className="doc-card" onClick={() => navigate(`/doc/${doc.id}`)}>
        <div className="doc-card__top">
          <span className={`doc-card__stripe pen-${(doc.title.length % 5)}`} />
          <button
            className="btn btn--icon doc-card__star"
            onClick={(e) => {
              e.stopPropagation()
              toggleStar(doc.id)
            }}
            aria-label={doc.starred ? 'Unstar' : 'Star'}
          >
            <Star
              size={16}
              fill={doc.starred ? 'var(--amber)' : 'none'}
              color={doc.starred ? 'var(--amber)' : 'currentColor'}
            />
          </button>
        </div>

        <h3 className="doc-card__title">{doc.title}</h3>
        <p className="doc-card__preview">{doc.preview || 'Empty document — start writing.'}</p>

        <div className="doc-card__footer">
          <div className="doc-card__meta">
            <PresenceStack people={active} size={22} max={3} />
            <span className="mono doc-card__time">{timeAgo(doc.updatedAt)}</span>
          </div>

          <div className="doc-card__actions" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn--icon" onClick={() => setShareOpen(true)} aria-label="Share">
              <Share2 size={15} />
            </button>
            {isOwner && (
              <button
                className="btn btn--icon"
                onClick={handleDelete}
                aria-label="Delete"
              >
                <Trash2 size={15} />
              </button>
            )}
            <div className="doc-card__more-wrap">
              <button className="btn btn--icon" onClick={() => setMenuOpen((o) => !o)} aria-label="More">
                <MoreHorizontal size={15} />
              </button>
              {menuOpen && (
                <div className="doc-card__menu" onMouseLeave={() => setMenuOpen(false)}>
                  <span>{isOwner ? 'Owned by you' : `Shared by ${doc.ownerName || 'someone'}`}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Document</h3>
            <p>Are you sure you want to delete "{doc.title}"? This action cannot be undone.</p>
            <div className="delete-confirm-buttons">
              <button className="btn btn--secondary" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}>
                Cancel
              </button>
              <button className="btn btn--danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {shareOpen && <ShareModal doc={doc} onClose={() => setShareOpen(false)} />}
    </>
  )
}
