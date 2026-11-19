import { useState } from 'react'
import { MANUAL_ICONS } from '../data/gameIcons.js'

// Color estable a partir del nombre, para los juegos sin ícono
function hue(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

// Ícono del juego. Si no hay imagen (o no carga), muestra la inicial sobre un color.
export default function GameIcon({ name, icons, size = 28, src: given, round = false }) {
  const src = given ?? MANUAL_ICONS[name] ?? icons?.[name]
  const [failed, setFailed] = useState(null)
  const style = { '--s': `${size}px` }

  if (src && failed !== src) {
    return (
      <img
        className={`gicon ${round ? 'round' : ''}`}
        style={style}
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(src)}
      />
    )
  }
  const initial = (name.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase()
  return (
    <span className={`gicon gicon-fallback ${round ? 'round' : ''}`} style={{ ...style, '--h': hue(name) }} aria-hidden="true">
      {initial}
    </span>
  )
}
