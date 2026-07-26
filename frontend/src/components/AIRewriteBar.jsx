import { useEffect, useState, useRef } from 'react';
import { Sparkles, Check, RotateCcw, X, Ban } from 'lucide-react';
import { API_BASE } from '../utils/api.js';
import './AIRewriteBar.css';

const TONES = [
  { value: 'clarity',  label: 'Clarity' },
  { value: 'concise',  label: 'Concise' },
  { value: 'formal',   label: 'Formal' },
  { value: 'friendly', label: 'Friendly' },
];

// Demo Mode has no authenticated session, so it can't call the real
// (auth-protected) /api/ai/rewrite endpoint. This lightweight local transform
// stands in for it — same tone options, same accept/try-again flow, just no
// network call — so the demo showcases the actual UI/UX without needing a
// backend or an LLM call on someone else's unauthenticated request.
function mockRewrite(text, tone) {
  let out = text.trim();
  if (tone === 'concise') {
    out = out
      .replace(/\b(very|really|just|actually|basically|literally|simply|kind of|sort of)\b\s*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  } else if (tone === 'formal') {
    out = out
      .replace(/\bcan't\b/gi, 'cannot')
      .replace(/\bdon't\b/gi, 'do not')
      .replace(/\bwon't\b/gi, 'will not')
      .replace(/\bi'm\b/gi, 'I am')
      .replace(/\bi'll\b/gi, 'I will');
  } else if (tone === 'friendly') {
    if (!/^(hey|hi|hello)\b/i.test(out)) {
      out = 'Just a quick note — ' + out.charAt(0).toLowerCase() + out.slice(1);
    }
  }
  out = out.charAt(0).toUpperCase() + out.slice(1);
  if (!/[.!?]$/.test(out)) out += '.';
  return out;
}

export default function AIRewriteBar({
  selectedText,
  selectionRange,
  onAccept,
  onClearSelection,
  onClose,
  rewriteSessionKey = 0,
  demoMode = false,
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [tone, setTone]             = useState('clarity');
  const [capturedText, setCapturedText] = useState('');
  const [active, setActive]         = useState(false);

  const prevSessionRef = useRef(0);
  const abortControllerRef = useRef(null);

  // Activates when user clicks the "AI Rewrite" toolbar button
  useEffect(() => {
    if (rewriteSessionKey > 0 && rewriteSessionKey !== prevSessionRef.current) {
      prevSessionRef.current = rewriteSessionKey;
      const textToRewrite = selectedText?.trim() || '';

      setCapturedText(textToRewrite);
      setActive(true);
      setSuggestion(null);
      setError(null);
    }
  }, [rewriteSessionKey, selectedText]);

  // Keeps the bar in sync with a NEW selection made while it's already open, so it
  // never operates on a stale span. Only re-syncs before a suggestion has been generated
  // (or while regenerating) — once a suggestion is shown, the user's current selection is
  // no longer relevant to what's on screen, so it's left alone until they act on it.
  useEffect(() => {
    if (!active || loading || suggestion) return;
    const trimmed = selectedText?.trim() || '';
    if (trimmed && trimmed !== capturedText) {
      setCapturedText(trimmed);
      setError(null);
    }
  }, [selectedText, active, loading, suggestion, capturedText]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  async function generate(overrideTone) {
    const textToUse = capturedText || selectedText?.trim();
    if (!textToUse) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const toneToUse = overrideTone || tone;
    setLoading(true);
    setSuggestion(null);
    setError(null);

    try {
      let rewritten;
      if (demoMode) {
        // Simulate realistic latency so the loading state reads the same as
        // the real flow, while staying abortable via "Stop & Cancel".
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, 500);
          controller.signal.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
        rewritten = mockRewrite(textToUse, toneToUse);
      } else {
        const res = await fetch(`${API_BASE}/api/ai/rewrite`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToUse, tone: toneToUse }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Rewrite failed');
        rewritten = data.rewritten || '';
      }
      setSuggestion(rewritten);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to rewrite text');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  }

  function handleCloseAll() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setSuggestion(null);
    setError(null);
    setActive(false);
    setCapturedText('');
    onClearSelection?.();
    onClose?.(); // Closes AI bar & returns toolbar mode to Text
  }

  function handleAccept() {
    if (!suggestion) return;
    onAccept(suggestion);
    handleCloseAll(); // Immediately close AI bar & switch back to Text mode
  }

  function handleToneSelect(newTone) {
    setTone(newTone);
    if (suggestion || loading) {
      generate(newTone);
    }
  }

  return (
    <div className="ai-bar">
      {!active && (
        <div className="ai-bar__hint-row">
          <p className="ai-bar__hint">
            <Sparkles size={14} /> Highlight text in the document, then click the <strong>✨ AI Rewrite</strong> button to customize tone.
          </p>
          <button className="btn btn--icon ai-bar__dismiss-hint" onClick={handleCloseAll} title="Close AI bar">
            <X size={15} />
          </button>
        </div>
      )}

      {active && (
        <>
          <div className="ai-bar__header-row">
            <div className="ai-bar__selected">
              <span className="ai-bar__label">Selected Text</span>
              <p>{capturedText ? `"${capturedText}"` : 'No text highlighted — select text in the document first.'}</p>
            </div>
            <button className="btn btn--secondary btn--sm ai-bar__cancel-btn" onClick={handleCloseAll} title="Close AI Rewrite">
              <X size={14} /> Close
            </button>
          </div>

          {capturedText && (
            <>
              <div className="ai-bar__tone-row">
                <span className="ai-bar__tone-label">Choose Tone:</span>
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    className={`ai-bar__tone-btn ${tone === t.value ? 'ai-bar__tone-btn--active' : ''}`}
                    onClick={() => handleToneSelect(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {!suggestion && !loading && (
                <div className="ai-bar__actions-row">
                  <button className="btn btn--primary btn--sm" onClick={() => generate()}>
                    <Sparkles size={14} /> Generate Rewrite
                  </button>
                  <button className="btn btn--secondary btn--sm" onClick={handleCloseAll}>
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="ai-bar__loading-row">
              <p className="ai-bar__loading">
                <span className="auth-spinner ai-bar__spinner" /> Generating rewrite...
              </p>
              <button className="btn btn--secondary btn--sm" onClick={handleCloseAll}>
                <Ban size={14} /> Stop & Cancel
              </button>
            </div>
          )}

          {error && (
            <div className="ai-bar__error-row">
              <p className="ai-bar__error">{error}</p>
              <button className="btn btn--secondary btn--sm" onClick={handleCloseAll}>
                Cancel
              </button>
            </div>
          )}

          {suggestion && (
            <div className="ai-bar__suggestion">
              <span className="ai-bar__label">Suggested Rewrite</span>
              <p className="ai-bar__suggestion-text">{suggestion}</p>
              <div className="ai-bar__actions">
                <button
                  className="btn btn--primary btn--sm"
                  onClick={handleAccept}
                >
                  <Check size={14} /> Accept & Replace
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => generate()}>
                  <RotateCcw size={14} /> Try Again
                </button>
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={handleCloseAll}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
