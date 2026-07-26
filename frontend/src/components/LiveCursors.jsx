import './LiveCursors.css'

export default function LiveCursors({ people }) {
  const PEN_HEX = {
    indigo: '#4c4fd8',
    coral: '#ff6b5d',
    teal: '#1d9a8b',
    amber: '#e2a93a',
    violet: '#8b5cf6',
    rose: '#f43f5e',
    sky: '#0ea5e9',
    lime: '#84cc16',
    0: '#4c4fd8',
    1: '#ff6b5d',
    2: '#1d9a8b',
    3: '#e2a93a',
    4: '#8b5cf6',
  }

  function getColor(p) {
    // penIndex is assigned per-document-session by the server and is
    // guaranteed unique among current collaborators; penColor is the user's
    // personal (randomly assigned at signup) preference and can collide
    // between two people in the same room, so penIndex takes priority.
    if (typeof p.penIndex === 'number' && PEN_HEX[p.penIndex] !== undefined) return PEN_HEX[p.penIndex]
    return PEN_HEX[p.penColor] || '#4c4fd8'
  }

  return (
    <div className="live-cursors">
      {people.map((p) => {
        const cursor = p.cursor
        if (!cursor || typeof cursor.x !== 'number' || typeof cursor.y !== 'number') return null

        const leftStyle = `${cursor.x}px`
        const topStyle = `${cursor.y}px`

        const color = getColor(p)

        return (
          <div
            className="live-cursor"
            key={p.id ?? p.userId}
            style={{ left: leftStyle, top: topStyle }}
          >
            <span className="live-cursor__caret" style={{ background: color }} />
            <span className="live-cursor__label" style={{ background: color }}>
              {p.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
