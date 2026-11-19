import { useEffect, useRef } from 'react'

// Ventana sobre la página: se cierra con Esc, tocando afuera o con la X.
// Bloquea el scroll de fondo y devuelve el foco a donde estaba.
export default function Modal({ title, onClose, header, children, variant }) {
  const closeRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    document.body.classList.add('modal-open')
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        // mantiene el foco adentro de la ventana
        const box = closeRef.current?.closest('.modal')
        const items = box?.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])')
        if (!items?.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus()
    }
  }, [onClose])

  return (
    <div className={`overlay ${variant ?? ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${variant ?? ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          {header}
          <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
