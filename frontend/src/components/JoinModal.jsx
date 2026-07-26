import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Link2, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { authHeaders } from '../utils/api.js'
import './JoinModal.css'

// See utils/api.js — VITE_API_URL lets this point at a separately-hosted
// backend in production; empty/unset keeps the relative path, which the Vite
// dev proxy (or a same-origin production deploy) resolves.
const BASE = `${import.meta.env.VITE_API_URL || ''}/api`

export default function JoinModal({ onClose }) {
  const navigate = useNavigate()
  const { fetchDocuments } = useApp()
  const [linkOrToken, setLinkOrToken] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin(e) {
    e.preventDefault()
    if (!linkOrToken.trim()) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${BASE}/documents/join`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          linkOrToken: linkOrToken.trim(),
          password: password.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to join document')

      await fetchDocuments()
      onClose()
      navigate(`/doc/${data.documentId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal join-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="join-modal__title-box">
            <Link2 size={20} className="join-modal__icon" />
            <h3>Join Document</h3>
          </div>
          <button className="btn btn--icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="join-modal__sub">
          Paste a document share link or token code to join the document and collaborate.
        </p>

        <form onSubmit={handleJoin} className="join-modal__form">
          <div className="join-modal__field">
            <label htmlFor="join-link">Share Link or Token</label>
            <div className="join-modal__input-wrapper">
              <Link2 size={16} />
              <input
                id="join-link"
                type="text"
                placeholder={`e.g. ${window.location.origin}/shared/abc123xyz or abc123xyz`}
                value={linkOrToken}
                onChange={(e) => setLinkOrToken(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="join-modal__field">
            <label htmlFor="join-password">Password / Passcode (Optional)</label>
            <div className="join-modal__input-wrapper">
              <Lock size={16} />
              <input
                id="join-password"
                type="password"
                placeholder="Enter password if link is protected"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="join-modal__error">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="join-modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading || !linkOrToken.trim()}
            >
              {loading ? (
                <span className="auth-spinner" style={{ width: 14, height: 14 }} />
              ) : (
                <>
                  Join Note <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
