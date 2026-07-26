import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Bell, Palette, AlertTriangle,
  Save, LogOut, Sun, Moon, Monitor, ChevronRight, Camera
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Avatar from '../components/Avatar.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useStickyHeader } from '../utils/useStickyHeader.js'
import './Settings.css'

const TABS = [
  { id: 'profile',        label: 'Profile',         icon: User },
  { id: 'notifications',  label: 'Notifications',   icon: Bell },
  { id: 'appearance',     label: 'Appearance',      icon: Palette },
  { id: 'danger',         label: 'Danger Zone',     icon: AlertTriangle },
]

const PEN_COLORS = [
  { index: 0, label: 'Indigo',  cssVar: 'var(--indigo)' },
  { index: 1, label: 'Coral',   cssVar: 'var(--coral)' },
  { index: 2, label: 'Teal',    cssVar: 'var(--teal)' },
  { index: 3, label: 'Amber',   cssVar: 'var(--amber)' },
  { index: 4, label: 'Violet',  cssVar: 'var(--violet)' },
]

export default function Settings() {
  const { profile, logout, updateProfile, notifyPrefs, updateNotifyPrefs, theme, setTheme, editorFontSize, setEditorFontSize, deleteAccount } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const { isSticky, isScrollingUp } = useStickyHeader(20)

  // Profile form state (guard against null profile while loading)
  const [name, setName]       = useState(profile?.name ?? '')
  const [bio, setBio]         = useState(profile?.bio ?? '')
  const [penIndex, setPenIndex] = useState(profile?.penIndex ?? 0)
  const [profileSaved, setProfileSaved] = useState(false)


  async function saveProfile() {
    await updateProfile({
      name,
      bio,
      penIndex,
      initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE' || deleting) return
    setDeleting(true)
    try {
      const ok = await deleteAccount()
      if (ok) {
        navigate('/login', { state: { deleted: true } })
      }
    } catch (err) {
      console.error('[settings] delete account failed', err)
    } finally {
      setDeleting(false)
    }
  }

  const currentTab = TABS.find(t => t.id === tab)

  // ProtectedRoute only renders Settings once authLoading is false, but that
  // doesn't strictly guarantee profile is populated yet in every render path —
  // rendering profile.name/profile.email below on a null profile would throw
  // and crash to the ErrorBoundary fallback instead of just showing a spinner.
  if (!profile) {
    return (
      <div className="auth-loading">
        <span className="auth-spinner" />
      </div>
    )
  }

  return (
    <div className="settings-page">
      {/* ── Header ── */}
      <header
        className={`settings-header ${isSticky ? 'header--glass-sticky' : ''} ${
          isSticky && !isScrollingUp ? 'header--hidden' : ''
        }`}
      >
        <Link to="/app" className="settings-header__brand">
          <span className="settings-header__mark">CN</span>
          CollabNoteAI
        </Link>
        <h1>Settings</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggle />
          <button className="btn btn--ghost btn--sm" onClick={handleLogout}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <div className="settings-layout">
        {/* ── Sidebar ── */}
        <aside className="settings-sidebar">
          <div className="settings-sidebar__user">
            <Avatar person={profile} size={44} />
            <div>
              <p className="settings-sidebar__name">{profile.name}</p>
              <span className="settings-sidebar__email">{profile.email}</span>
            </div>
          </div>

          <nav className="settings-nav">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`settings-nav__item ${tab === t.id ? 'settings-nav__item--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <t.icon size={16} />
                {t.label}
                <ChevronRight size={14} className="settings-nav__chevron" />
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main panel ── */}
        <main className="settings-main">
          {/* Mobile section header */}
          <div className="settings-section-header">
            <h2>{currentTab?.label}</h2>
          </div>

          {/* ─── Profile Tab ─── */}
          {tab === 'profile' && (
            <div className="settings-section">
              <div className="settings-avatar-row">
                <div className="settings-avatar-wrap">
                  <Avatar person={{ ...profile, penIndex }} size={72} />
                  <button className="settings-avatar-change" aria-label="Change avatar">
                    <Camera size={14} />
                  </button>
                </div>
                <div>
                  <p className="settings-label-lg">{name || 'Your name'}</p>
                  <span className="settings-sub">{profile.email}</span>
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="s-name">Display name</label>
                <input id="s-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>

              <div className="settings-field">
                <label htmlFor="s-bio">Bio <span className="settings-sub">(optional)</span></label>
                <textarea id="s-bio" rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="A short bio visible to collaborators..." />
              </div>

              <div className="settings-field">
                <label>Pen color <span className="settings-sub">(your cursor color)</span></label>
                <div className="pen-picker">
                  {PEN_COLORS.map(pc => (
                    <button
                      key={pc.index}
                      type="button"
                      className={`pen-swatch ${penIndex === pc.index ? 'pen-swatch--active' : ''}`}
                      style={{ background: pc.cssVar }}
                      aria-label={pc.label}
                      onClick={() => setPenIndex(pc.index)}
                    />
                  ))}
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="s-email">Email address</label>
                <input id="s-email" type="email" value={profile.email} readOnly className="input--readonly" />
                <span className="settings-sub">Contact support to change your email.</span>
              </div>

              <div className="settings-field">
                <label>Change password</label>
                <input type="password" placeholder="Current password" disabled />
                <input type="password" placeholder="New password" style={{ marginTop: 8 }} disabled />
                <span className="settings-sub">Password change coming soon — contact support to reset.</span>
              </div>

              <button
                className="btn btn--primary"
                onClick={saveProfile}
                style={{ marginTop: 8 }}
              >
                <Save size={15} />
                {profileSaved ? 'Saved!' : 'Save changes'}
              </button>
            </div>
          )}

          {/* ─── Notifications Tab ─── */}
          {tab === 'notifications' && (
            <div className="settings-section">
              <p className="settings-desc">Control which activities trigger a notification.</p>

              {[
                { key: 'email',    label: 'Email digests',         desc: 'Daily summary of activity on your documents.' },
                { key: 'comments', label: 'Comment alerts',        desc: 'Notify when someone comments on your document.' },
                { key: 'shares',   label: 'Document shares',       desc: 'Notify when someone shares a document with you.' },
                { key: 'activity', label: 'Collaborator activity',  desc: 'Notify when a collaborator joins or edits.' },
              ].map(item => (
                <div className="settings-toggle-row" key={item.key}>
                  <div>
                    <p className="settings-toggle-row__label">{item.label}</p>
                    <span className="settings-sub">{item.desc}</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!!notifyPrefs[item.key]}
                      onChange={e => updateNotifyPrefs({ [item.key]: e.target.checked })}
                    />
                    <span className="toggle-switch__track" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* ─── Appearance Tab ─── */}
          {tab === 'appearance' && (
            <div className="settings-section">
              <p className="settings-desc">Choose how CollabNoteAI looks on this device.</p>

              <div className="settings-field">
                <label>Theme</label>
                <div className="theme-options">
                  {[
                    { val: 'light',  label: 'Light',  icon: Sun },
                    { val: 'dark',   label: 'Dark',   icon: Moon },
                    { val: 'system', label: 'System', icon: Monitor },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      className={`theme-option ${theme === opt.val ? 'theme-option--active' : ''}`}
                      onClick={() => setTheme(opt.val)}
                    >
                      <opt.icon size={22} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="s-fontsize">Editor font size</label>
                <select
                  id="s-fontsize"
                  className="settings-select"
                  value={editorFontSize}
                  onChange={(e) => setEditorFontSize(e.target.value)}
                >
                  <option value="14">Small (14px)</option>
                  <option value="16">Medium (16px)</option>
                  <option value="18">Large (18px)</option>
                  <option value="20">Extra large (20px)</option>
                </select>
                <span className="settings-sub">Applies to the document editor only.</span>
              </div>

              <div className="settings-field">
                <label>Reduced motion</label>
                <div className="settings-toggle-row" style={{ border: 'none', padding: 0, marginTop: 0 }}>
                  <span className="settings-sub">Respects your operating system's accessibility setting automatically.</span>
                  <div className="settings-badge">Auto</div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Danger Zone Tab ─── */}
          {tab === 'danger' && (
            <div className="settings-section">
              <div className="danger-card">
                <div className="danger-card__icon">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <p className="danger-card__title">Delete account</p>
                  <p className="settings-sub">Permanently delete your account, all documents you own, comments, notifications, and remove you from all shared documents. This cannot be undone.</p>
                </div>
              </div>

              <div className="settings-field" style={{ marginTop: 20 }}>
                <label htmlFor="s-delete-confirm">
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  id="s-delete-confirm"
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <button
                className="btn btn--danger"
                style={{ marginTop: 12 }}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? (
                  <>
                    <span className="auth-spinner" style={{ width: 14, height: 14 }} />
                    Deleting account…
                  </>
                ) : (
                  <>
                    <AlertTriangle size={15} /> Permanently delete my account
                  </>
                )}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
