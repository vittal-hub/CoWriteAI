import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PenLine,
  Type,
  Mic,
  Sparkles,
  MessageSquare,
  Share2,
  Bell,
  Users,
  ArrowRight,
  ChevronDown,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import UserProfileMenu from '../components/UserProfileMenu.jsx'
import { useStickyHeader } from '../utils/useStickyHeader.js'
import './Landing.css'

const features = [
  {
    icon: Users,
    pen: 'pen-0',
    title: 'Real-time, together',
    text: 'Keystrokes, sketches, and cursors sync instantly across up to 5 collaborators on the same document — no refresh needed.',
  },
  {
    icon: PenLine,
    pen: 'pen-1',
    title: 'Write or sketch',
    text: 'Switch between the text cursor and the pencil at any point. Diagrams are saved right alongside your notes.',
  },
  {
    icon: Mic,
    pen: 'pen-2',
    title: 'Talk it out',
    text: 'Dictate with your voice and it lands under your name, with light auto-cleanup of common transcription slips.',
  },
  {
    icon: Sparkles,
    pen: 'pen-3',
    title: 'AI rewrite, on demand',
    text: 'Select a clumsy sentence and ask for a clearer version, in the tone you choose. You keep the final say.',
  },
  {
    icon: MessageSquare,
    pen: 'pen-4',
    title: 'Threaded comments',
    text: 'Leave a note on a single word or the whole page, and keep replies attached to the conversation.',
  },
  {
    icon: Share2,
    pen: 'pen-0',
    title: 'Share your way',
    text: 'Send a link or invite by email, and choose exactly who can view versus edit — up to 5 people per document.',
  },
]

const faqs = [
  {
    q: 'What is CollabNoteAI?',
    a: 'CollabNoteAI is a real-time collaborative notebook. You can write, sketch, dictate, and comment on the same document as your team, with everyone\'s changes syncing live.',
  },
  {
    q: 'How does real-time collaboration work?',
    a: 'Every open document keeps a live WebSocket connection. As you type, draw, or move your cursor, those changes are broadcast to everyone else viewing the document, so you see each other\'s edits and cursors update instantly.',
  },
  {
    q: 'Can multiple users edit the same document?',
    a: 'Yes — up to 5 people (the owner plus 4 collaborators) can have a document open and edit it together at the same time.',
  },
  {
    q: 'Does the application automatically save my work?',
    a: 'Yes. Your document content and drawings are saved automatically in the background as you work, so you don\'t need to save manually.',
  },
  {
    q: 'Is my data secure?',
    a: 'Passwords are hashed before they\'re stored, and sessions use secure, HTTP-only cookies. Only the document owner and the people they invite can access a given document.',
  },
  {
    q: 'Can I share documents with others?',
    a: 'Yes. Share a document by inviting someone\'s email directly, or generate a link — with an optional password — that grants view or edit access.',
  },
  {
    q: 'Does voice dictation work in all supported browsers?',
    a: 'Voice dictation uses your browser\'s built-in speech recognition, which is currently available in Chromium-based browsers like Chrome and Edge. If your browser doesn\'t support it, the app will let you know rather than failing silently.',
  },
]

function CursorTag({ className, name, children, delay }) {
  return (
    <span className={`hero-cursor ${className}`} style={{ animationDelay: delay }}>
      <span className="hero-cursor__flag">{name}</span>
      {children}
    </span>
  )
}

function FAQItem({ q, a, open, onToggle }) {
  return (
    <div className={`faq-item ${open ? 'faq-item--open' : ''}`}>
      <button className="faq-item__question" onClick={onToggle} aria-expanded={open}>
        {q}
        <ChevronDown size={18} className="faq-item__chevron" />
      </button>
      {open && <p className="faq-item__answer">{a}</p>}
    </div>
  )
}

export default function Landing() {
  const { isAuthenticated } = useApp()
  const { isSticky, isScrollingUp } = useStickyHeader(30)
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div className="landing">
      <header
        className={`landing__nav ${isSticky ? 'header--glass-sticky' : ''} ${
          isSticky && !isScrollingUp ? 'header--hidden' : ''
        }`}
      >
        <div className="landing__brand">
          <span className="landing__brand-mark">CN</span>
          CollabNoteAI
        </div>
        <nav className="landing__nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing__nav-actions">
          <ThemeToggle showLabel />
          {isAuthenticated ? (
            <UserProfileMenu />
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost btn--sm hide-mobile">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn--primary btn--sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow mono">real-time · collaborative · multiplayer</p>
          <h1>
            One page.
            <br />
            Everyone's ink at once.
          </h1>
          <p className="hero__sub">
            CollabNoteAI is a shared notebook where typing, sketching, and talking all land on the
            same page — live, with your team's cursors moving right alongside yours.
          </p>
          <div className="hero__actions">
            <Link to={isAuthenticated ? '/app' : '/signup'} className="btn btn--primary">
              Start a document <ArrowRight size={16} />
            </Link>
            {!isAuthenticated && (
              <Link to="/demo" className="btn btn--secondary">
                Try demo
              </Link>
            )}
            <a href="#features" className="btn btn--ghost">
              See what it does
            </a>
          </div>
        </div>

        <div className="hero__stage" aria-hidden="true">
          <div className="hero-doc">
            <div className="hero-doc__bar">
              <div className="hero-doc__dots">
                <span /> <span /> <span />
              </div>
              <span className="hero-doc__title">Sprint Notes — Live</span>
            </div>
            <div className="hero-doc__body">
              <p className="hero-line hero-line--1">
                Kickoff call at 10 — three of us joining from{' '}
                <CursorTag className="pen-1" name="Meera" delay="0.2s">
                  different time zones
                </CursorTag>
                .
              </p>
              <p className="hero-line hero-line--2">
                Action items get their own{' '}
                <CursorTag className="pen-2" name="Devansh" delay="1.4s">
                  checklist
                </CursorTag>{' '}
                right under the heading.
              </p>
              <p className="hero-line hero-line--3">
                <CursorTag className="pen-3" name="Priya" delay="2.6s">
                  Rough sketch
                </CursorTag>{' '}
                of the flow goes here — pencil, not paragraphs.
              </p>
              <div className="hero-doc__sketch">
                <svg viewBox="0 0 220 70" fill="none">
                  <path
                    d="M8 55 C 40 10, 70 65, 105 30 S 170 5, 212 40"
                    stroke="var(--coral)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="8" cy="55" r="4" fill="var(--coral)" />
                  <circle cx="212" cy="40" r="4" fill="var(--coral)" />
                </svg>
              </div>
            </div>
            <div className="hero-doc__footer">
              <div className="hero-doc__avatars">
                <span className="hero-avatar pen-0">Y</span>
                <span className="hero-avatar pen-1">MI</span>
                <span className="hero-avatar pen-2">DR</span>
              </div>
              <span className="mono hero-doc__saved">auto-saved · synced</span>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid" id="features">
        <p className="eyebrow mono">what's in the page</p>
        <h2>Everything the room needs, nothing it doesn't.</h2>
        <div className="feature-grid__list">
          {features.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className={`feature-card__icon ${f.pen}`}>
                <f.icon size={20} strokeWidth={2} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how" id="how">
        <p className="eyebrow mono">the toolbar</p>
        <h2>Four tools, always one tap away.</h2>
        <div className="how__tools">
          <div className="how__tool">
            <Type size={22} />
            <span>Text</span>
          </div>
          <div className="how__tool">
            <PenLine size={22} />
            <span>Pencil</span>
          </div>
          <div className="how__tool">
            <Mic size={22} />
            <span>Voice</span>
          </div>
          <div className="how__tool">
            <Sparkles size={22} />
            <span>AI rewrite</span>
          </div>
        </div>
        <p className="how__note">
          <Bell size={15} /> You'll know the moment someone shares, comments, or joins — quiet
          notifications, never a popup storm.
        </p>
      </section>

      <section className="faq" id="faq">
        <p className="eyebrow mono">good to know</p>
        <h2>Frequently asked questions.</h2>
        <div className="faq__list">
          {faqs.map((item, i) => (
            <FAQItem
              key={item.q}
              q={item.q}
              a={item.a}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
            />
          ))}
        </div>
      </section>

      <footer className="landing__footer">
        <div className="landing__footer-top">
          <span className="landing__footer-copyright">© 2026 CollabNoteAI. All rights reserved.</span>
          <nav className="landing__footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact</a>
          </nav>
        </div>
        <div className="landing__footer-bottom">
          <p>Built with React, Node.js, MongoDB, WebSockets, and AI.</p>
          <p>Made for real-time collaborative document editing.</p>
        </div>
      </footer>
    </div>
  )
}
