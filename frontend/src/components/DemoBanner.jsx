import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import './DemoBanner.css'

export default function DemoBanner() {
  return (
    <div className="demo-banner">
      <p className="demo-banner__text">
        <Sparkles size={15} />
        <span>
          <strong>You're using Demo Mode.</strong> Changes are temporary and won't be saved. Create
          a free account to unlock collaboration, sharing, cloud storage, and document management.
        </span>
      </p>
      <div className="demo-banner__actions">
        <Link to="/login" className="btn btn--ghost btn--sm">
          Sign in
        </Link>
        <Link to="/signup" className="btn btn--primary btn--sm">
          Create account
        </Link>
      </div>
    </div>
  )
}
