import { useEffect, useState } from 'react'
import { FileText, Check, X, BellRing } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import './InviteBanner.css'

export default function InviteBanner() {
  const { notifications, acceptInvite, declineInvite, fetchDocuments } = useApp()
  const [activeBanner, setActiveBanner] = useState(null)

  // Detect unread share notifications
  useEffect(() => {
    const unreadInvite = notifications.find(
      (n) => !n.read && n.type === 'share' && n.text.toLowerCase().includes('invited')
    )
    if (unreadInvite) {
      setActiveBanner(unreadInvite)
    }
  }, [notifications])

  if (!activeBanner) return null

  const docId = typeof activeBanner.doc === 'object' ? activeBanner.doc?._id : activeBanner.doc

  async function handleAccept() {
    try {
      if (docId) await acceptInvite(docId)
    } finally {
      setActiveBanner(null)
    }
  }

  async function handleDecline() {
    try {
      if (docId) await declineInvite(docId)
    } finally {
      setActiveBanner(null)
    }
  }

  return (
    <div className="invite-banner">
      <div className="invite-banner__header">
        <BellRing size={16} className="invite-banner__icon" />
        <span>Document Invitation</span>
        <button className="invite-banner__close" onClick={() => setActiveBanner(null)}>
          <X size={14} />
        </button>
      </div>
      <p className="invite-banner__text">{activeBanner.text}</p>
      <div className="invite-banner__actions">
        <button className="btn btn--primary btn--sm invite-banner__btn" onClick={handleAccept}>
          <Check size={14} /> Accept & Open
        </button>
        <button className="btn btn--secondary btn--sm invite-banner__btn" onClick={handleDecline}>
          Decline
        </button>
      </div>
    </div>
  )
}
