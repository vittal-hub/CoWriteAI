import './Avatar.css'

export default function Avatar({ person, size = 32, ring = false }) {
  return (
    <div
      className={`avatar pen-${person.penIndex ?? 0} ${ring ? 'avatar--ring' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={person.name}
    >
      {person.avatarUrl ? (
        <img className="avatar__img" src={person.avatarUrl} alt={person.name || 'User avatar'} />
      ) : (
        person.initials
      )}
    </div>
  )
}
