import { useState, useRef, useEffect } from 'react'
import Avatar from './Avatar.jsx'
import './PresenceStack.css'

export default function PresenceStack({ people: activePeople, max = 4, size = 28 }) {
  const [selectedUser, setSelectedUser] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setSelectedUser(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!activePeople || activePeople.length === 0) return null
  const shown = activePeople.slice(0, max)
  const overflow = activePeople.length - shown.length

  return (
    <div className="presence-stack" ref={ref}>
      {shown.map((p) => (
        <div
          className="presence-stack__item"
          key={p.id ?? p.userId ?? p.email}
          onClick={(e) => {
            e.stopPropagation()
            const pKey = p.id ?? p.userId
            const selectedKey = selectedUser?.id ?? selectedUser?.userId
            setSelectedUser(selectedUser && pKey !== undefined && selectedKey === pKey ? null : p)
          }}
          style={{ cursor: 'pointer' }}
          title={`Click to view ${p.name}'s details`}
        >
          <Avatar person={p} size={size} ring />
          <span className="presence-stack__dot" style={{ background: 'var(--teal)' }} />
        </div>
      ))}
      {overflow > 0 && (
        <div className="presence-stack__overflow" style={{ width: size, height: size }}>
          +{overflow}
        </div>
      )}

      {selectedUser && (
        <div className="presence-popover" onClick={(e) => e.stopPropagation()}>
          <div className="presence-popover__header">
            <Avatar person={selectedUser} size={36} ring />
            <div>
              <h4 className="presence-popover__name">{selectedUser.name || 'Anonymous User'}</h4>
              <p className="presence-popover__email">{selectedUser.email || 'Active Collaborator'}</p>
            </div>
          </div>
          <div className="presence-popover__status">
            <span className="presence-popover__dot" /> Active now in this document
          </div>
        </div>
      )}
    </div>
  )
}
