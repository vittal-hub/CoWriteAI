import { useEffect, useRef, useState } from 'react'
import { Bell, MessageSquare, Share2, PenLine, Check, X, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { timeAgo } from '../utils/time.js'
import './NotificationBell.css'

const ICONS = { comment: MessageSquare, share: Share2, edit: PenLine, reply: MessageSquare }

export default function NotificationBell() {
  const {
    notifications,
    markNotificationsRead,
    fetchNotifications,
    acceptInvite,
    declineInvite,
    clearNotifications,
    deleteNotification,
  } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const unread = notifications.filter((n) => !n.read).length
  const [actedIds, setActedIds] = useState(() => new Map())

  // Close on outside click
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function handleOpen() {
    const wasOpen = open
    setOpen((o) => !o)
    if (!wasOpen) {
      fetchNotifications()
      markNotificationsRead()
    }
  }

  async function handleAccept(n, e) {
    e.stopPropagation()
    const docId = typeof n.doc === 'object' ? (n.doc?._id || n.doc?.id) : n.doc
    if (!docId) return
    setActedIds((prev) => new Map(prev).set(n.id, { status: 'loading', action: 'accept' }))
    try {
      await acceptInvite(docId)
      setActedIds((prev) => new Map(prev).set(n.id, { status: 'done', action: 'accept' }))
    } catch {
      setActedIds((prev) => {
        const next = new Map(prev)
        next.delete(n.id)
        return next
      })
    }
  }

  async function handleDecline(n, e) {
    e.stopPropagation()
    const docId = typeof n.doc === 'object' ? (n.doc?._id || n.doc?.id) : n.doc
    if (!docId) return
    setActedIds((prev) => new Map(prev).set(n.id, { status: 'loading', action: 'decline' }))
    try {
      await declineInvite(docId)
      setActedIds((prev) => new Map(prev).set(n.id, { status: 'done', action: 'decline' }))
    } catch {
      setActedIds((prev) => {
        const next = new Map(prev)
        next.delete(n.id)
        return next
      })
    }
  }

  function handleClearSingle(id, e) {
    e.stopPropagation()
    deleteNotification(id)
  }

  return (
    <div className="notif" ref={ref}>
      <button
        className="btn btn--icon notif__trigger"
        onClick={handleOpen}
        aria-label="Notifications"
      >
        <Bell size={19} />
        {unread > 0 && <span className="notif__badge">{unread}</span>}
      </button>

      {open && (
        <div className="notif__panel">
          <div className="notif__header">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button className="notif__clear-all-btn" onClick={clearNotifications}>
                Clear all
              </button>
            )}
          </div>
          {notifications.length === 0 && (
            <p className="notif__empty">Nothing yet — activity on your documents shows up here.</p>
          )}
          <div className="notif__list">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] || Bell
              const isInvite = n.type === 'share' && n.text.toLowerCase().includes('invited')
              const acted = actedIds.get(n.id)
              const isLoading = acted?.status === 'loading'
              const isAccepted = acted?.action === 'accept' && acted?.status === 'done'
              const isDeclined = acted?.action === 'decline' && acted?.status === 'done'
              return (
                <div className={`notif__item ${n.read ? '' : 'notif__item--unread'}`} key={n.id}>
                  <span className="notif__icon">
                    <Icon size={15} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <p>{n.text}</p>
                    <span className="mono notif__time">{timeAgo(n.createdAt)}</span>
                    {isInvite && n.doc && (
                      <div className="notif__actions">
                        {isAccepted && (
                          <span className="notif__status notif__status--accepted">
                            <Check size={13} /> Accepted
                          </span>
                        )}
                        {isDeclined && (
                          <span className="notif__status notif__status--declined">
                            <X size={13} /> Declined
                          </span>
                        )}
                        {!isAccepted && !isDeclined && (
                          <>
                            <button
                              className="btn btn--primary btn--sm notif__btn-accept"
                              onClick={(e) => handleAccept(n, e)}
                              disabled={isLoading}
                            >
                              {acted?.action === 'accept' && isLoading ? (
                                <span className="auth-spinner" />
                              ) : (
                                <Check size={13} />
                              )}
                              Accept
                            </button>
                            <button
                              className="btn btn--secondary btn--sm notif__btn-decline"
                              onClick={(e) => handleDecline(n, e)}
                              disabled={isLoading}
                            >
                              {acted?.action === 'decline' && isLoading ? (
                                <span className="auth-spinner" />
                              ) : (
                                <X size={13} />
                              )}
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    className="notif__remove-btn"
                    onClick={(e) => handleClearSingle(n.id, e)}
                    title="Clear notification"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
