// Bloque que se despliega y se contrae con animación. Usa el mismo truco de filas que los tops.
export default function Collapse({ open, id, children }) {
  return (
    <div className={`rdetail ${open ? 'show' : ''}`} id={id} aria-hidden={!open}>
      <div className="rdetail-inner">{children}</div>
    </div>
  )
}

export function MoreButton({ open, onClick, controls, more, less = 'Ocultar' }) {
  return (
    <button type="button" className="more-btn" aria-expanded={open} aria-controls={controls} onClick={onClick}>
      {open ? less : more}
      <svg className="chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
        <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
