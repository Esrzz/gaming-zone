import { useMemo } from 'react'
import { useInView } from '../hooks/useInView.js'
import CountUp from './CountUp.jsx'

const STATUS_LABEL = {
  online: 'En línea',
  idle: 'Ausente',
  dnd: 'No molestar',
  offline: 'Desconectado',
}

function PadIcon() {
  return (
    <svg className="act-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.5 7h9A5.5 5.5 0 0 1 22 12.5v.4A3.6 3.6 0 0 1 18.4 16.5c-1 0-1.9-.4-2.5-1.1L14.6 14h-5.2l-1.3 1.4c-.6.7-1.5 1.1-2.5 1.1A3.6 3.6 0 0 1 2 12.9v-.4A5.5 5.5 0 0 1 7.5 7Zm.5 2.2v1.3H6.7v1.4H8v1.3h1.4v-1.3h1.3v-1.4H9.4V9.2H8Zm8.2.8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm2 1.8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
      />
    </svg>
  )
}

function Activity({ member }) {
  if (member.activity) {
    return (
      <div className="activity live">
        <PadIcon />
        <span className="act-text">
          <span className="verb">{member.activity.verb}</span>{' '}
          <strong>{member.activity.name}</strong>
        </span>
      </div>
    )
  }
  const text = member.status === 'offline' ? 'Desconectado' : 'En Discord, sin jugar'
  return (
    <div className="activity">
      <span className="act-text">{text}</span>
    </div>
  )
}

function Row({ member, rank, max, index, run }) {
  const pct = member.hours / max
  return (
    <li className={`row rank-${rank}`} style={{ '--i': index, '--p': pct }}>
      <span className="rank">{rank}</span>

      <div className="member">
        <span
          className="avatar"
          style={{ '--h': member.hue }}
          role="img"
          aria-label={STATUS_LABEL[member.status]}
        >
          {member.name[0]}
          <i className={`dot ${member.status}`} />
        </span>
        <strong className="name">{member.name}</strong>
      </div>

      <Activity member={member} />

      <div className="hours">
        <span className="hours-num">
          <CountUp value={member.hours} run={run} duration={1100 + index * 60} /> h
        </span>
        <span className="bar"><i /></span>
      </div>
    </li>
  )
}

export default function Leaderboard({ members }) {
  const [ref, inView] = useInView(0.15)
  const sorted = useMemo(() => [...members].sort((a, b) => b.hours - a.hours), [members])
  const max = sorted[0]?.hours || 1

  return (
    <section className="section wrap" id="ranking">
      <div className="section-head">
        <h2>Ranking por horas conectadas</h2>
        <p>
          Cuenta el tiempo que cada uno pasa en el servidor. Por ahora son datos de ejemplo; los
          reales los va a cargar el bot.
        </p>
      </div>

      <div className={`board ${inView ? 'in' : ''}`} ref={ref}>
        <div className="board-cols" aria-hidden="true">
          <span />
          <span>Miembro</span>
          <span>Actividad</span>
          <span className="right">Horas</span>
        </div>
        <ol className="rows">
          {sorted.map((m, i) => (
            <Row key={m.id} member={m} rank={i + 1} max={max} index={i} run={inView} />
          ))}
        </ol>
      </div>
    </section>
  )
}
