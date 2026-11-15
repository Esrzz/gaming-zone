import { useState } from 'react'

const STATUS_LABEL = {
  online: 'En línea',
  idle: 'Ausente',
  dnd: 'No molestar',
  offline: 'Desconectado',
}

function hueFrom(text) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

// Foto real de Discord; si no carga o no hay, muestra la inicial sobre un color.
export default function Avatar({ member }) {
  const [failed, setFailed] = useState(false)
  const hue = member.hue ?? hueFrom(member.name)
  const showPhoto = member.avatar && !failed

  return (
    <span
      className="avatar"
      style={{ '--h': hue }}
      role="img"
      aria-label={`${member.name}: ${STATUS_LABEL[member.status] ?? STATUS_LABEL.offline}`}
    >
      {showPhoto ? (
        <img
          src={member.avatar}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        Array.from(member.name)[0]?.toUpperCase()
      )}
      <i className={`dot ${member.status}`} />
    </span>
  )
}
