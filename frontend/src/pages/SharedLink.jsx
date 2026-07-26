import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { API_BASE } from '../utils/api.js'
import './SharedLink.css'

export default function SharedLink() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, authLoading } = useApp()
  const [loading, setLoading] = useState(true)
  const [docInfo, setDocInfo] = useState(null)
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return // wait for session restore so credentials below are accurate

    // credentials: 'include' is required here — without it, the owner or an
    // already-invited collaborator opening their own link is seen as an
    // anonymous visitor by the backend's optionalAuth check, which incorrectly
    // rejects them under the default 'restricted' linkAccess.
    fetch(`${API_BASE}/api/documents/shared/${token}`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Link invalid or expired')
        setDocInfo(data.document)

        if (!isAuthenticated) {
          // No session to join with — send them to log in, then straight back
          // to this same link so the join intent isn't lost.
          navigate('/login', { state: { from: `/shared/${token}` } })
          return
        }

        if (!data.document.requiresPassword) {
          const joinRes = await fetch(`${API_BASE}/api/documents/join`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linkOrToken: token }),
          })
          const joinData = await joinRes.json()
          if (joinRes.ok && joinData.documentId) {
            navigate(`/doc/${joinData.documentId}`)
          } else {
            throw new Error(joinData.message || 'Failed to join document')
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token, navigate, isAuthenticated, authLoading])

  async function handleVerify(e) {
    e.preventDefault()
    if (!password.trim()) return
    setError('')
    setVerifying(true)
    try {
      const res = await fetch(`${API_BASE}/api/documents/join`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkOrToken: token, password: password.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Incorrect password')
      navigate(`/doc/${data.documentId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="shared-link-page">
        <span className="auth-spinner" />
      </div>
    )
  }

  return (
    <div className="shared-link-page">
      <div className="shared-link-card">
        <div className="shared-link-icon">
          <Lock size={28} />
        </div>
        <h2>Password Protected Document</h2>
        <p className="shared-link-sub">
          "{docInfo?.title || 'Shared Document'}" is password protected by the owner. Enter the passcode to continue.
        </p>

        <form onSubmit={handleVerify}>
          <input
            type="password"
            placeholder="Enter document password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="shared-link-input"
            autoFocus
          />
          {error && (
            <div className="shared-link-error">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <button type="submit" className="btn btn--primary shared-link-btn" disabled={verifying || !password.trim()}>
            {verifying ? <span className="auth-spinner" style={{ width: 16, height: 16 }} /> : <>Access Document <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}
