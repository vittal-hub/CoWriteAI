import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Settings, LogOut } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Avatar from './Avatar.jsx'
import './UserProfileMenu.css'

// Profile avatar + dropdown for authenticated users, shown in the Landing page
// header. Reuses AppContext for auth state so there's a single source of truth
// for who's logged in — this component doesn't fetch or store anything itself.
export default function UserProfileMenu() {
  const { profile, logout } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!profile) return null

  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <div className="user-menu" ref={ref}>
      <button
        className="user-menu__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Avatar person={profile} size={34} ring={open} />
      </button>

      {open && (
        <div className="user-menu__panel" role="menu">
          <div className="user-menu__header">
            <Avatar person={profile} size={38} />
            <div className="user-menu__identity">
              <span className="user-menu__name">{profile.name}</span>
              <span className="user-menu__email">{profile.email}</span>
            </div>
          </div>

          <div className="user-menu__divider" />

          <button className="user-menu__item" role="menuitem" onClick={() => { setOpen(false); navigate('/app') }}>
            <LayoutDashboard size={16} /> Go to Dashboard
          </button>
          <button className="user-menu__item" role="menuitem" onClick={() => { setOpen(false); navigate('/settings') }}>
            <Settings size={16} /> Profile / Settings
          </button>

          <div className="user-menu__divider" />

          <button className="user-menu__item user-menu__item--danger" role="menuitem" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  )
}
