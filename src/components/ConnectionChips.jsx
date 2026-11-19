import { BRAND_ICONS } from '../data/brandIcons.js'
import { describe } from '../lib/connections.js'

const LINK = 'M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5'

function BrandIcon({ type }) {
  const path = BRAND_ICONS[type]
  return path ? (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={path} fill="currentColor" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={LINK} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  )
}

// Las conexiones que la persona comparte, como en Discord: ícono de la plataforma y su nombre (con enlace si tiene perfil público)
export default function ConnectionChips({ list }) {
  if (!list?.length) return null
  return (
    <ul className="conns" aria-label="Conexiones">
      {list.map((c, i) => {
        const { label, href } = describe(c)
        const inner = (
          <>
            <BrandIcon type={c.t} />
            <span className="c-name">{c.n}</span>
            {href && (
              <svg className="c-out" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </>
        )
        return (
          <li key={`${c.t}-${c.i}-${i}`}>
            {href ? (
              <a className="conn" href={href} target="_blank" rel="noopener noreferrer" title={`${label}: ${c.n}`} aria-label={`${label}: ${c.n} (se abre en otra pestaña)`}>{inner}</a>
            ) : (
              <span className="conn" title={`${label}: ${c.n}`} aria-label={`${label}: ${c.n}`}>{inner}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
