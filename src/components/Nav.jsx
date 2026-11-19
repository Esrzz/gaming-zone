import { SERVER } from '../config.js'

export default function Nav({ onOpenMembers }) {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <a className="brand" href="#inicio" aria-label={`${SERVER.name}, ir al inicio`}>
          <img src="/logo-sm.webp" alt="" width="36" height="36" />
          <span>{SERVER.name}</span>
        </a>
        <nav className="nav-links" aria-label="Secciones">
          <a href="#ranking">Ranking</a>
          <a href="#tops">Tops</a>
          <button type="button" className="nav-btn" onClick={onOpenMembers}>
            Miembros
          </button>
          <a className="btn btn-sm primary" href={SERVER.invite} target="_blank" rel="noreferrer">
            Unirme
          </a>
        </nav>
      </div>
    </header>
  )
}
