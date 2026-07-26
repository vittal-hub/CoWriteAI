import { useState } from 'react'
import { X, Link2, Check, Mail, AlertCircle, Lock, Globe } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Avatar from './Avatar.jsx'
import './ShareModal.css'

// See utils/api.js — VITE_API_URL lets this point at a separately-hosted
// backend in production; empty/unset keeps the relative path, which the Vite
// dev proxy (or a same-origin production deploy) resolves.
const BASE = `${import.meta.env.VITE_API_URL || ''}/api`

export default function ShareModal({ doc, onClose }) {
  const { currentUser, fetchDocuments } = useApp()
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('edit')
  const [copied, setCopied] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const [linkAccess, setLinkAccess] = useState(
    doc.linkAccess === 'restricted' ? 'restricted' : doc.linkAccess || 'view'
  )
  const [password, setPassword] = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [passMessage, setPassMessage] = useState('')

  async function inviteByEmail(e) {
    e.preventDefault()
    if (!email.trim()) return
    setInviteError('')
    setInviteSuccess('')
    setInviting(true)
    try {
      const res = await fetch(`${BASE}/documents/${doc.id}/share`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), permission }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not share document')
      setInviteSuccess(data.message || `Shared with ${email}`)
      setEmail('')
      fetchDocuments() // refresh collaborator list
    } catch (err) {
      setInviteError(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function updateLinkSetting(newAccess, newPass = password) {
    setPassSaving(true)
    setPassMessage('')
    try {
      const res = await fetch(`${BASE}/documents/${doc.id}/link`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkAccess: newAccess,
          sharePassword: newPass.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update link settings')
      setLinkAccess(data.linkAccess)
      fetchDocuments()
      return data
    } catch (err) {
      setPassMessage(`Error: ${err.message}`)
      throw err
    } finally {
      setPassSaving(false)
    }
  }

  async function handleLinkAccessChange(e) {
    const val = e.target.value
    setLinkAccess(val)
    try {
      await updateLinkSetting(val)
      setPassMessage(val === 'restricted' ? 'Link access set to restricted' : 'Link sharing enabled')
      setTimeout(() => setPassMessage(''), 2500)
    } catch (err) {
      // error handled
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    try {
      const activeAccess = linkAccess === 'restricted' ? 'view' : linkAccess
      await updateLinkSetting(activeAccess, password)
      setPassMessage(password.trim() ? 'Password protection set!' : 'Password protection removed.')
      setTimeout(() => setPassMessage(''), 2500)
    } catch (err) {
      // error handled
    }
  }

  async function copyLink() {
    let effectiveAccess = linkAccess
    if (linkAccess === 'restricted') {
      effectiveAccess = 'view'
      try {
        await updateLinkSetting('view')
      } catch (err) {
        // continue copy even if network fails
      }
    }
    const url = `${window.location.origin}/shared/${doc.shareToken || doc.id}`
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const sharedWith = doc.sharedWith || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Share "{doc.title}"</h3>
          <button className="btn btn--icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className="share-form" onSubmit={inviteByEmail}>
          <div className="share-form__row">
            <Mail size={16} className="share-form__icon" />
            <input
              type="email"
              placeholder="Invite by email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select value={permission} onChange={(e) => setPermission(e.target.value)}>
              <option value="edit">Can edit</option>
              <option value="view">Can view</option>
            </select>
            <button className="btn btn--primary btn--sm" type="submit" disabled={inviting || !email.trim()}>
              {inviting ? <span className="auth-spinner" style={{ width: 14, height: 14 }} /> : 'Invite'}
            </button>
          </div>
          {inviteError && (
            <div className="share-feedback share-feedback--error">
              <AlertCircle size={13} /> {inviteError}
            </div>
          )}
          {inviteSuccess && (
            <div className="share-feedback share-feedback--success">
              <Check size={13} /> {inviteSuccess}
            </div>
          )}
        </form>

        <div className="share-people">
          <p className="share-suggestions__label">People with access (Max 5)</p>
          {/* Owner */}
          <div className="share-person">
            <Avatar person={currentUser} size={26} />
            <div>
              <p>{currentUser?.name || 'You'}</p>
              <span>Owner</span>
            </div>
          </div>
          {sharedWith.map((p) => (
            <div className="share-person" key={p.id}>
              <Avatar person={p} size={26} />
              <div>
                <p>{p.name || p.email}</p>
                <span>{p.email}</span>
              </div>
              <span className={`share-person__perm ${p.status === 'pending' ? 'share-person__perm--pending' : ''}`}>
                {p.status === 'pending' ? 'Pending invite' : `Can ${p.permission || 'edit'}`}
              </span>
            </div>
          ))}
          {sharedWith.length === 0 && (
            <p className="share-none">No collaborators yet. Invite up to 4 collaborators above.</p>
          )}
        </div>

        {/* General Link Access */}
        <div className="share-password-box">
          <div className="share-password-box__title">
            <Globe size={14} /> Link Access Permission
          </div>
          <div className="share-form__row">
            <select value={linkAccess} onChange={handleLinkAccessChange} style={{ width: '100%' }}>
              <option value="view">Anyone with link can view</option>
              <option value="edit">Anyone with link can edit</option>
              <option value="restricted">Restricted (Only invited people)</option>
            </select>
          </div>
        </div>

        {/* Password Protection Box */}
        <form className="share-password-box" onSubmit={handleSavePassword}>
          <div className="share-password-box__title">
            <Lock size={14} /> Link Password Protection (Optional)
          </div>
          <div className="share-form__row">
            <input
              type="password"
              placeholder="Set link passcode/password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="btn btn--secondary btn--sm" type="submit" disabled={passSaving}>
              {passSaving ? 'Saving...' : 'Set Password'}
            </button>
          </div>
          {passMessage && <p className="share-pass-msg">{passMessage}</p>}
        </form>

        <button className="link-copy" onClick={copyLink}>
          {copied ? <Check size={15} /> : <Link2 size={15} />}
          {copied ? 'Link copied!' : 'Copy protected share link'}
        </button>
      </div>
    </div>
  )
}
