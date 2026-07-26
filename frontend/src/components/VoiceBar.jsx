import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Wand2, ArrowRight, X, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import './VoiceBar.css'

const SpeechRecognitionAPI =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

// A tiny mock "spell + rewrite" pass, standing in for a real language
// model call — swap for a server endpoint once one exists.
function cleanUpTranscript(text) {
  const fixes = { teh: 'the', recieve: 'receive', adn: 'and', im: "I'm", dont: "don't" }
  let out = text
  Object.entries(fixes).forEach(([wrong, right]) => {
    out = out.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right)
  })
  out = out.trim()
  if (out) out = out[0].toUpperCase() + out.slice(1)
  if (out && !/[.!?]$/.test(out)) out += '.'
  return out
}

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings and try again.',
  'service-not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings and try again.',
  'audio-capture': 'No microphone was found. Connect a microphone and try again.',
  'network': 'A network error interrupted speech recognition. Try again.',
}

export default function VoiceBar({ onInsert, onClose }) {
  const { profile } = useApp()
  const [status, setStatus] = useState(() => (SpeechRecognitionAPI ? 'idle' : 'unsupported'))
  const [interimText, setInterimText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)

  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const manualStopRef = useRef(true)
  const isMountedRef = useRef(true)

  // Created once for the lifetime of this panel — never recreated on re-render,
  // so Start/Stop always act on the same instance (no duplicate sessions).
  useEffect(() => {
    isMountedRef.current = true
    if (!SpeechRecognitionAPI) return

    const rec = new SpeechRecognitionAPI()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onstart = () => {
      if (!isMountedRef.current) return
      setStatus('listening')
      setErrorMessage(null)
    }

    rec.onresult = (e) => {
      if (!isMountedRef.current) return
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        const chunk = result[0].transcript
        if (result.isFinal) {
          const needsSpace = finalTranscriptRef.current && !/\s$/.test(finalTranscriptRef.current)
          finalTranscriptRef.current += (needsSpace ? ' ' : '') + chunk.trim()
        } else {
          interim += chunk
        }
      }
      setFinalText(finalTranscriptRef.current)
      setInterimText(interim)
    }

    rec.onerror = (e) => {
      if (!isMountedRef.current) return
      const err = e.error
      // "no-speech" and "aborted" are benign/transient — onend decides whether
      // to restart, so don't surface them as errors.
      if (err === 'no-speech' || err === 'aborted') return

      if (ERROR_MESSAGES[err]) {
        manualStopRef.current = true
        setStatus('error')
        setErrorMessage(ERROR_MESSAGES[err])
      } else {
        setErrorMessage(`Speech recognition error: ${err}`)
      }
    }

    rec.onend = () => {
      if (!isMountedRef.current) return
      if (manualStopRef.current) {
        setStatus((s) => (s === 'error' ? s : 'stopped'))
        return
      }
      // Recognition ended on its own — most browsers auto-stop continuous
      // recognition after a period of silence even with continuous=true.
      // Restart transparently so a pause never truncates dictation; the
      // accumulated transcript lives in finalTranscriptRef, independent of
      // the recognition instance, so nothing is lost across the restart.
      try {
        rec.start()
      } catch {
        setStatus('idle')
      }
    }

    recognitionRef.current = rec

    return () => {
      isMountedRef.current = false
      manualStopRef.current = true
      try {
        rec.stop()
      } catch {
        /* already stopped */
      }
    }
  }, [])

  function handleStart() {
    if (!SpeechRecognitionAPI || status === 'listening') return
    setErrorMessage(null)
    manualStopRef.current = false
    try {
      recognitionRef.current.start()
      setStatus('listening')
    } catch {
      // Already-started race (e.g. rapid double click) — ignore, current
      // session keeps running rather than throwing an unhandled error.
    }
  }

  function handleStop() {
    if (status !== 'listening') return
    manualStopRef.current = true
    setStatus('processing')
    try {
      recognitionRef.current.stop()
    } catch {
      setStatus('stopped')
    }
  }

  function handleCancel() {
    manualStopRef.current = true
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    finalTranscriptRef.current = ''
    setInterimText('')
    setFinalText('')
    setErrorMessage(null)
    setStatus(SpeechRecognitionAPI ? 'idle' : 'unsupported')
    onClose?.()
  }

  function handleInsert() {
    const cleaned = cleanUpTranscript(finalText)
    if (!cleaned) return
    onInsert(cleaned, profile)
    finalTranscriptRef.current = ''
    setFinalText('')
  }

  const combinedPreview = [finalText, interimText].filter(Boolean).join(' ')
  const cleaned = cleanUpTranscript(finalText)
  const supported = !!SpeechRecognitionAPI

  return (
    <div className="voice-bar">
      <div className="voice-bar__top">
        <span className={`voice-bar__status voice-bar__status--${status}`}>
          {status === 'listening' && <><span className="voice-bar__dot" /> Listening…</>}
          {status === 'processing' && 'Processing…'}
          {status === 'error' && <><AlertCircle size={13} /> Error</>}
          {status === 'stopped' && 'Stopped'}
          {status === 'idle' && 'Idle'}
          {status === 'unsupported' && 'Unavailable'}
        </span>
        <button
          className="btn btn--icon voice-bar__cancel-btn"
          onClick={handleCancel}
          title="Cancel dictation"
          aria-label="Cancel dictation"
        >
          <X size={16} />
        </button>
      </div>

      <div className="voice-bar__row">
        <span className="voice-bar__label">
          Speaking as <strong>{profile?.name || 'You'}</strong>
        </span>

        <button
          className={`voice-bar__mic ${status === 'listening' ? 'voice-bar__mic--live' : ''}`}
          onClick={status === 'listening' ? handleStop : handleStart}
          disabled={!supported || status === 'processing'}
        >
          {status === 'listening' ? <Square size={15} /> : <Mic size={15} />}
          {status === 'listening' ? 'Stop' : 'Start dictating'}
        </button>
      </div>

      {!supported && (
        <p className="voice-bar__hint">
          Speech recognition isn't supported in this browser — try Chrome or Edge.
        </p>
      )}

      {errorMessage && <p className="voice-bar__error">{errorMessage}</p>}

      {combinedPreview && (
        <div className="voice-bar__preview">
          <div className="voice-bar__preview-head">
            <span className={`voice-bar__badge pen-${profile?.penIndex ?? 0}`}>
              {profile?.name || 'You'}
            </span>
            <span className="voice-bar__auto">
              <Wand2 size={12} /> auto-corrected
            </span>
          </div>
          <p>
            {cleaned}
            {interimText && <span className="voice-bar__interim"> {interimText}</span>}
          </p>
          <button
            className="btn btn--primary btn--sm"
            onClick={handleInsert}
            disabled={!cleaned}
          >
            Insert into document <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
