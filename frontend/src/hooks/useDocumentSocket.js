import { useEffect, useRef, useState, useCallback } from 'react'
import { wsUrl } from '../utils/api.js'

export function useDocumentSocket(docId) {
  const socketRef = useRef(null)
  const [activePresence, setActivePresence] = useState([])
  const handlersRef = useRef({})

  const on = useCallback((type, callback) => {
    if (!handlersRef.current[type]) {
      handlersRef.current[type] = []
    }
    handlersRef.current[type].push(callback)
    return () => {
      handlersRef.current[type] = handlersRef.current[type].filter(cb => cb !== callback)
    }
  }, [])

  const emit = useCallback((type, payload) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  useEffect(() => {
    if (!docId) return

    let reconnectTimer
    let heartbeatTimer
    let isMounted = true

    const connect = () => {
      // Connect to the /ws endpoint — proxied locally by Vite, or resolved
      // against VITE_WS_URL in production if the backend is on its own host.
      const ws = new WebSocket(wsUrl(`/ws?docId=${docId}`))

      ws.onopen = () => {
        if (!isMounted) return
        socketRef.current = ws

        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 15000)
      }

      ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data)

          // Built-in presence management
          if (type === 'presence:state') {
            setActivePresence((payload.collaborators || []).map(p => ({ ...p, id: p.userId })))
          } else if (type === 'presence:join') {
            setActivePresence(prev => {
              const exists = prev.find(p => String(p.userId) === String(payload.user.id))
              if (exists) return prev
              return [...prev, {
                id: payload.user.id,
                userId: payload.user.id,
                name: payload.user.name,
                penColor: payload.user.penColor,
                avatarUrl: payload.user.avatarUrl,
                initials: payload.user.initials,
                cursor: null,
                penIndex: payload.user.penIndex || 0,
              }]
            })
          } else if (type === 'presence:leave') {
            setActivePresence(prev => prev.filter(p => String(p.userId) !== String(payload.userId)))
          } else if (type === 'presence:cursor') {
            setActivePresence(prev => prev.map(p =>
              String(p.userId) === String(payload.userId) ? { ...p, cursor: payload.cursor } : p
            ))
          }

          // Dispatch to custom handlers
          if (handlersRef.current[type]) {
            handlersRef.current[type].forEach(cb => cb(payload))
          }
        } catch (err) {
          console.error('[ws] Error parsing message:', err)
        }
      }

      ws.onclose = () => {
        clearInterval(heartbeatTimer)
        socketRef.current = null
        if (isMounted) {
          reconnectTimer = setTimeout(connect, 3000)
        }
      }

      ws.onerror = (err) => {
        console.error('[ws] Error:', err)
      }
    }

    connect()

    return () => {
      isMounted = false
      clearTimeout(reconnectTimer)
      clearInterval(heartbeatTimer)
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [docId])

  return { activePresence, emit, on }
}
