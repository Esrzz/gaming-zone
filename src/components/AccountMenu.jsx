import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import { SERVER } from '../config.js'
import { readToken } from '../lib/auth.js'

// Foto y nombre de quien inició sesión, con un menú: mi perfil, quitar mis conexiones y cerrar sesión.
export default function AccountMenu({ me, hasConnections, onOpenProfile, onRemoveConnections, onLogout }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => !root.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // La sesión viaja en el fragmento (#…), que el navegador nunca manda a un servidor; así también sirve con clic del medio
  const token = readToken()
  const nonogramHref = token ? `${SERVER.nonogram}#gz_login=${encodeURIComponent(token)}` : SERVER.nonogram

  const run = (fn) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div className="account" ref={root}>
      <button type="button" className="account-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <Avatar member={me} />
        <span className="account-name">{me.name}</span>
        <svg className="chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="account-menu" role="group" aria-label="Tu cuenta">
          <button type="button" onClick={run(onOpenProfile)}>Mi perfil</button>
          <a href={nonogramHref} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Nonogram Zone ↗</a>
          {hasConnections && <button type="button" onClick={run(onRemoveConnections)}>Quitar mis conexiones</button>}
          <button type="button" onClick={run(onLogout)}>Cerrar sesión</button>
        </div>
      )}
    </div>
  )
}
