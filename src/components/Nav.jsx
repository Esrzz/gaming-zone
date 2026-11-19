import { SERVER } from '../config.js'
import AccountMenu from './AccountMenu.jsx'
import { loginUrl } from '../lib/auth.js'

export default function Nav({ onOpenMembers, onOpenRecords, onOpenEvents, unread = 0, account }) {
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
          <button type="button" className="nav-btn" onClick={onOpenRecords}>
            Récords
          </button>
          <button type="button" className="nav-btn" onClick={onOpenEvents}>
            Novedades
            {unread > 0 && <span className="nav-badge" aria-label={`${unread} nuevas`}>{unread > 9 ? '9+' : unread}</span>}
          </button>
          <button type="button" className="nav-btn" onClick={onOpenMembers}>
            Miembros
          </button>
          {account ? (
            <AccountMenu {...account} />
          ) : (
            <>
              <a className="nav-login" href={loginUrl}>Iniciar sesión</a>
              <a className="btn btn-sm primary" href={SERVER.invite} target="_blank" rel="noreferrer">
                Unirme
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
