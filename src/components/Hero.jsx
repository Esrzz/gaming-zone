import { SERVER } from '../config.js'
import CountUp from './CountUp.jsx'

export default function Hero({ members }) {
  const online = members.filter((m) => m.status !== 'offline').length
  const totalHours = members.reduce((s, m) => s + m.hours, 0)
  const gameCount = new Set(members.flatMap((m) => Object.keys(m.games))).size

  return (
    <section className="hero wrap" id="inicio">
      <div className="hero-copy">
        <p className="live-pill">
          <span className="pulse" aria-hidden="true" />
          {online} en línea ahora
        </p>
        <h1>{SERVER.headline}</h1>
        <p className="lede">{SERVER.lede}</p>
        <div className="cta-row">
          <a className="btn primary" href={SERVER.invite} target="_blank" rel="noreferrer">
            Unirme al Discord
          </a>
          <a className="btn ghost" href="#ranking">
            Ver el ranking
          </a>
        </div>
        <dl className="stats">
          <div>
            <dt>miembros</dt>
            <dd><CountUp value={members.length} /></dd>
          </div>
          <div>
            <dt>horas juntos</dt>
            <dd><CountUp value={totalHours} /></dd>
          </div>
          <div>
            <dt>juegos distintos</dt>
            <dd><CountUp value={gameCount} /></dd>
          </div>
        </dl>
      </div>

      <div className="hero-visual">
        <span className="hero-glow" aria-hidden="true" />
        <div className="hero-art">
          <img
            src="/mascot.webp"
            width="960"
            height="960"
            alt="Mascota de Gaming Zone: un monstruo violeta con capucha turquesa y auriculares rojos"
            fetchpriority="high"
          />
        </div>
      </div>
    </section>
  )
}
