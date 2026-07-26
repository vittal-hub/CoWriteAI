import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Check, MailCheck } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import './Auth.css'

const PEN_COLORS = [
  { index: 0, label: 'Indigo', cssVar: 'var(--indigo)' },
  { index: 1, label: 'Coral', cssVar: 'var(--coral)' },
  { index: 2, label: 'Teal', cssVar: 'var(--teal)' },
  { index: 3, label: 'Amber', cssVar: 'var(--amber)' },
  { index: 4, label: 'Violet', cssVar: 'var(--violet)' },
]

function passwordStrength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_CLASS = ['', 'strength--weak', 'strength--fair', 'strength--good', 'strength--strong']

export default function Signup() {
  const { register, authError } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [penIndex, setPenIndex] = useState(0)
  const [localError, setLocalError] = useState('')
  const [loading, setLoading] = useState(false)
  // Registration no longer logs the user in directly (the backend requires
  // email verification first) — once it succeeds, show a "check your inbox"
  // screen instead of navigating into the app.
  const [registered, setRegistered] = useState(false)

  const error = localError || authError
  const strength = passwordStrength(password)

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    if (!name.trim() || !email.trim() || !password) {
      setLocalError('Please fill in all fields.')
      return
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match.')
      return
    }
    if (strength < 2) {
      setLocalError('Please choose a stronger password.')
      return
    }
    setLoading(true)
    // PEN_COLORS' index order (indigo, coral, teal, amber, violet) matches the
    // first 5 entries of the backend's User.penColor enum — this is what
    // actually persists the picker's selection as the account's cursor color.
    const penColor = PEN_COLORS[penIndex]?.label.toLowerCase()
    const { ok } = await register(name.trim(), email.trim(), password, penColor)
    setLoading(false)
    if (ok) setRegistered(true)
  }

  if (registered) {
    return (
      <div className="auth-layout">
        <div className="auth-form-panel" style={{ width: '100%' }}>
          <div className="auth-form-wrap">
            <div className="auth-form-header">
              <MailCheck size={32} style={{ marginBottom: 12, color: 'var(--indigo)' }} />
              <h1>Check your email</h1>
              <p>
                We sent a verification link to <strong>{email}</strong>. Click it to activate your
                account — the link expires in 24 hours.
              </p>
            </div>
            <p className="auth-switch">
              Already verified? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-layout">
      {/* Left branding */}
      <div className="auth-brand">
        <div className="auth-brand__inner">
          <Link to="/" className="auth-brand__logo">
            <span className="auth-brand__mark">CW</span>
            CoWriteAI
          </Link>
          <div className="auth-brand__tagline">
            <h2>Join thousands of teams writing together.</h2>
            <p>Set up your account in under a minute and invite your first collaborator instantly.</p>
          </div>
          <div className="auth-features">
            {[
              'Real-time collaborative editing',
              'Pencil drawing & voice dictation',
              'AI-powered rewrites',
              'Threaded comments & mentions',
              'Works on any device',
            ].map((f) => (
              <div className="auth-feature-item" key={f}>
                <Check size={15} className="auth-feature-check" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h1>Create your account</h1>
            <p>Free forever for small teams. No credit card.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="auth-error" role="alert">{error}</div>}

            <div className="auth-field">
              <label htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="signup-email">Work email</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="signup-password">Password</label>
              <div className="auth-input-wrap">
                <input
                  id="signup-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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
              {password && (
                <div className="strength-bar">
                  <div className={`strength-bar__fill ${STRENGTH_CLASS[strength]}`} style={{ width: `${strength * 25}%` }} />
                  <span className="strength-bar__label">{STRENGTH_LABEL[strength]}</span>
                </div>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="signup-confirm">Confirm password</label>
              <input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label>Your pen color <span className="auth-field__hint">(your cursor color for collaborators)</span></label>
              <div className="pen-picker">
                {PEN_COLORS.map((pc) => (
                  <button
                    key={pc.index}
                    type="button"
                    className={`pen-swatch ${penIndex === pc.index ? 'pen-swatch--active' : ''}`}
                    style={{ background: pc.cssVar }}
                    aria-label={pc.label}
                    onClick={() => setPenIndex(pc.index)}
                  >
                    {penIndex === pc.index && <Check size={13} color="#fff" />}
                  </button>
                ))}
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
                <>Create account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
