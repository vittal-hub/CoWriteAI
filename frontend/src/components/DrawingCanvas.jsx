import { useEffect, useRef } from 'react'
import './DrawingCanvas.css'

function resolveColor(cssColor) {
  if (!cssColor.startsWith('var(')) {
    return cssColor;
  }
  const match = cssColor.match(/var\((--[^)]+)\)/);
  if (!match) {
    return '#4c4fd8';
  }
  const varName = match[1];
  const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return computed || '#4c4fd8';
}

export default function DrawingCanvas({ active, isEraser, color, strokes, setStrokes, onDrawStroke }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const current = useRef([])
  const strokesRef = useRef(strokes)

  // Always keep strokesRef in sync with latest strokes state
  useEffect(() => {
    strokesRef.current = strokes
    redraw()
  }, [strokes])

  // Canvas must cover the full scrollable height, not just the viewport, or
  // drawing below the first screenful hits nothing. ResizeObserver covers
  // layout changes; MutationObserver covers content growing as you type.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement

    let rafId = null
    const resize = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const width = parent.clientWidth
        const height = Math.max(parent.scrollHeight, parent.clientHeight)
        // Guard against redundant resizes — setting canvas.width/height clears
        // the pixel buffer, so only touch it when the size actually changed.
        if (canvas.width === width && canvas.height === height) return
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        canvas.width = width
        canvas.height = height
        redraw()
      })
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    const mo = new MutationObserver(resize)
    mo.observe(parent, { childList: true, subtree: true, characterData: true })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  // Redraw when theme changes (since CSS variables change)
  useEffect(() => {
    const observer = new MutationObserver(() => redraw())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ;(strokesRef.current || []).forEach((s) => {
      paintStroke(ctx, s)
    })
  }

  function paintStroke(ctx, stroke) {
    if (!stroke.points || stroke.points.length < 2) {
      return
    }
    const color = resolveColor(stroke.color || '#4c4fd8')
    ctx.strokeStyle = color
    ctx.lineWidth = stroke.width || 2.6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    stroke.points.forEach((p, i) => {
      if (i === 0) return
      ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()
  }

  function getPos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function eraseNear(pos) {
    const radius = 16
    const nextStrokes = (strokesRef.current || []).filter((stroke) => {
      return !stroke.points.some((p) => {
        const dx = p.x - pos.x
        const dy = p.y - pos.y
        return Math.sqrt(dx * dx + dy * dy) <= radius
      })
    })
    if (nextStrokes.length !== (strokesRef.current || []).length) {
      setStrokes(nextStrokes)
    }
  }

  function start(e) {
    if (!active) return
    drawing.current = true
    const pos = getPos(e)
    if (isEraser) {
      eraseNear(pos)
    } else {
      current.current = [pos]
    }
  }

  function move(e) {
    if (!active || !drawing.current) return
    const pos = getPos(e)
    if (isEraser) {
      eraseNear(pos)
    } else {
      current.current.push(pos)
      const ctx = canvasRef.current.getContext('2d')
      const resolved = resolveColor(color || '#4c4fd8')
      ctx.strokeStyle = resolved
      ctx.lineWidth = 2.6
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      const prev = current.current[current.current.length - 2]
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
  }

  function end() {
    if (!active || !drawing.current) return
    drawing.current = false
    if (!isEraser && current.current.length > 1) {
      const newPoints = [...current.current]
      const newStroke = { color, points: newPoints, width: 2.6 }
      setStrokes((prev) => [...prev, newStroke])
      if (onDrawStroke) onDrawStroke(newStroke)
    }
    current.current = []
  }

  return (
    <canvas
      ref={canvasRef}
      className={`draw-canvas ${active ? (isEraser ? 'draw-canvas--eraser' : 'draw-canvas--active') : ''}`}
      onMouseDown={start}
      onMouseMove={move}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
    />
  )
}
