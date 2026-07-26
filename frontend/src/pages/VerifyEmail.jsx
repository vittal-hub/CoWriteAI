import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import './Auth.css'

export default function VerifyEmail() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { verifyEmail, resendVerification } = useApp()
  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    let cancelled = false
    verifyEmail(token).then((res) => {
      if (cancelled) return
      if (res.ok) {
        setStatus('success')
        setTimeout(() => navigate('/app'), 1500)
      } else {
        setStatus('error')
        setError(res.message || 'This verification link is invalid or has expired.')
      }
    })
    return () => { cancelled = true }
  }, [token, verifyEmail, navigate])

  async function handleResend(e) {
    e.preventDefault()
    if (!resendEmail.trim()) return
    setResending(true)
    const res = await resendVerification(resendEmail.trim())
    setResending(false)
    setResendMessage(res.message || 'If that account exists, a new link has been sent.')
  }

  return (
    <div className="auth-layout">
      <div className="auth-form-panel" style={{ width: '100%' }}>
        <div className="auth-form-wrap">
          {status === 'verifying' && (
            <div className="auth-form-header">
              <span className="auth-spinner" />
              <h1>Verifying your email…</h1>
            </div>
          )}

          {status === 'success' && (
            <div className="auth-form-header">
              <CheckCircle2 size={32} style={{ marginBottom: 12, color: 'var(--teal)' }} />
              <h1>Email verified!</h1>
              <p>Taking you to your documents…</p>
            </div>
          )}

          {status === 'error' && (
            <>
              <div className="auth-form-header">
                <XCircle size={32} style={{ marginBottom: 12, color: 'var(--danger)' }} />
                <h1>Verification failed</h1>
                <p>{error}</p>
              </div>

              <form className="auth-form" onSubmit={handleResend} noValidate>
                <div className="auth-field">
                  <label htmlFor="resend-email">Resend verification link</label>
                  <input
                    id="resend-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn--primary auth-submit" disabled={resending}>
                  {resending ? <span className="auth-spinner" /> : 'Resend link'}
                </button>
                {resendMessage && <p className="auth-switch">{resendMessage}</p>}
              </form>

              <p className="auth-switch">
                <Link to="/login">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
