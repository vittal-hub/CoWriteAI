import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 20,
            background: 'var(--paper, #f5f6f1)',
            color: 'var(--ink, #1b2430)',
            fontFamily: 'sans-serif',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong loading this view</h2>
          <p style={{ color: '#d3453b', fontSize: 13, maxWidth: 520, fontFamily: 'monospace', wordBreak: 'break-word' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.href = '/app'
            }}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              background: '#1b2430',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Back to documents
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
