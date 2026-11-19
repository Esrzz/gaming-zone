import { useEffect } from 'react'
import { SERVER } from '../config.js'

// Aviso arriba de la página (inicio de sesión correcto, errores...). Los correctos se van solos.
export default function Notice({ notice, onClose }) {
  useEffect(() => {
    if (!notice || notice.kind !== 'ok') return
    const id = setTimeout(onClose, 5000)
    return () => clearTimeout(id)
  }, [notice, onClose])

  if (!notice) return null
  return (
    <div className={`notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
      <span>
        {notice.text}
        {notice.invite && (
          <>
            {' '}
            <a href={SERVER.invite} target="_blank" rel="noreferrer">Unirme al Discord</a>
          </>
        )}
      </span>
      <button type="button" onClick={onClose} aria-label="Cerrar aviso">×</button>
    </div>
  )
}
