import { Sun, Moon, Monitor } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const CYCLE = { light: 'dark', dark: 'system', system: 'light' }
const ICONS = { light: Sun, dark: Moon, system: Monitor }
const LABELS = { light: 'Light', dark: 'Dark', system: 'System' }

/**
 * A single button that cycles through light → dark → system.
 * Drop it anywhere in the header.
 */
export default function ThemeToggle({ showLabel = false }) {
  const { theme, setTheme } = useApp()
  const Icon = ICONS[theme] || Monitor

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(CYCLE[theme] || 'system')}
      aria-label={`Switch theme (currently ${LABELS[theme]})`}
      title={`Theme: ${LABELS[theme]} — click to cycle`}
    >
      <Icon size={15} />
      {showLabel && <span>{LABELS[theme]}</span>}
    </button>
  )
}
