import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import './Auth.css'

export default function Login() {
  const { login, authError, resendVerification } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [localError, setLocalError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resending, setResending] = useState(false)

  const error = localError || authError
  // The backend returns this exact phrase for an unverified account (403) —
  // matching on it lets the UI offer a resend action instead of just a
  // generic error string.
  const needsVerification = !!error && /verify your email/i.test(error)

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setResendMessage('')
    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields.')
      return
    }
    setLoading(true)
    const ok = await login(email.trim(), password)
    setLoading(false)
    // Sends the user back to a shared-link (or other) page they were trying to
    // reach before being bounced here, instead of always landing on /app.
    if (ok) navigate(location.state?.from || '/app')
  }

  async function handleResend() {
    setResending(true)
    const res = await resendVerification(email.trim())
    setResending(false)
    setResendMessage(res.message || 'If that account exists, a new link has been sent.')
  }

  return (
    <div className="auth-layout">
      {/* Left branding panel */}
      <div className="auth-brand">
        <div className="auth-brand__inner">
          <Link to="/" className="auth-brand__logo">
            <span className="auth-brand__mark">CN</span>
            CollabNoteAI
          </Link>
          <div className="auth-brand__tagline">
            <h2>Your team's thoughts, in one place.</h2>
            <p>Write, sketch, and talk together in real time — no refreshes, no conflicts.</p>
          </div>
          <div className="auth-brand__dots" aria-hidden="true">
            <div className="auth-dot pen-0" />
            <div className="auth-dot pen-1" />
            <div className="auth-dot pen-2" />
            <div className="auth-dot pen-3" />
            <div className="auth-dot pen-4" />
          </div>
          <div className="auth-brand__preview">
            <div className="auth-preview-card">
              <div className="auth-preview-card__bar">
                <span />
                <span />
                <span />
              </div>
              <p>Sprint Notes — <span className="auth-preview-card__live">● Live</span></p>
              <p className="auth-preview-card__line">Kickoff call at 10 — three of us joining from <span className="auth-cursor pen-1">different time zones</span>.</p>
              <div className="auth-preview-card__users">
                <span className="auth-avatar pen-0">Y</span>
                <span className="auth-avatar pen-1">MI</span>
                <span className="auth-avatar pen-2">DR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h1>Welcome back</h1>
            <p>Sign in to your CollabNoteAI workspace</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="auth-error" role="alert">
                {error}
                {needsVerification && (
                  <button
                    type="button"
                    className="auth-field__forgot"
                    style={{ display: 'block', marginTop: 6 }}
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? 'Sending…' : 'Resend verification email'}
                  </button>
                )}
                {resendMessage && <p style={{ marginTop: 6, marginBottom: 0 }}>{resendMessage}</p>}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">
                Password
                <Link to="#" className="auth-field__forgot">Forgot?</Link>
              </label>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary auth-submit"
              disabled={loading}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                <>Sign in <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/signup">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
