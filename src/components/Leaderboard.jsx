import { useMemo } from 'react'
import { useInView } from '../hooks/useInView.js'
import CountUp from './CountUp.jsx'
import { fmtHours } from '../lib/format.js'
import Avatar from './Avatar.jsx'
import { MemberLink } from '../context/MemberContext.jsx'
import GameIcon from './GameIcon.jsx'
import { MANUAL_ICONS } from '../data/gameIcons.js'

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

function Activity({ member, icons }) {
  if (member.activity) {
    return (
      <div className="activity live">
        {MANUAL_ICONS[member.activity.name] || icons?.[member.activity.name] ? <GameIcon name={member.activity.name} icons={icons} size={22} /> : <PadIcon />}
        <span className="act-text">
          <span className="verb">{member.activity.verb}</span>{' '}
          <strong>{member.activity.name}</strong>
        </span>
      </div>
    )
  }
  return (
    <div className="activity">
      <span className="act-text">{member.status === 'offline' ? 'Desconectado' : 'Sin juego activo'}</span>
    </div>
  )
}

function Row({ member, rank, max, index, run, icons }) {
  return (
    <li className={`row rank-${rank}`} style={{ '--i': index, '--p': member.hours / max }}>
      <span className="rank">{rank}</span>

      <div className="member">
        <Avatar member={member} />
        <strong className="name"><MemberLink id={member.id} name={member.name} /></strong>
        {member.inVoice && (
          <span className="voice-tag" title="Está en un canal de voz">
            en voz
          </span>
        )}
      </div>

      <Activity member={member} icons={icons} />

      <div className="hours">
        <span className="hours-num">
          <CountUp value={member.hours} run={run} format={fmtHours} duration={1100 + index * 60} />
        </span>
        <span className="bar"><i /></span>
      </div>
    </li>
  )
}

export default function Leaderboard({ members, icons, live, stale }) {
  const [ref, inView] = useInView(0.15)

  // Solo quienes ya sumaron horas en voz o están en voz ahora
  const rows = useMemo(
    () => members.filter((m) => m.hours > 0 || m.inVoice).sort((a, b) => b.hours - a.hours),
    [members],
  )
  const max = rows[0]?.hours || 1

  return (
    <section className="section wrap" id="ranking">
      <div className="section-head">
        <div className="head-row">
          <h2>Ranking por horas en voz</h2>
          <span className={`chip ${live && !stale ? 'on' : ''}`}>
            {stale ? 'Bot desconectado' : live ? 'En vivo' : 'Datos de ejemplo'}
          </span>
        </div>
        <p>
          {stale
            ? 'El bot está desconectado en este momento. Se muestran las últimas horas guardadas.'
            : live
              ? 'Suma el tiempo que cada uno pasa en los canales de voz. Se actualiza solo.'
              : 'Estos son datos de ejemplo. Cuando el bot esté conectado, acá van a aparecer los reales.'}
        </p>
      </div>

      <div className={`board ${inView ? 'in' : ''}`} ref={ref}>
        {rows.length === 0 ? (
          <p className="empty">Todavía nadie sumó horas. Entrá a un canal de voz del Discord y vas a aparecer acá.</p>
        ) : (
          <>
            <div className="board-cols" aria-hidden="true">
              <span />
              <span>Miembro</span>
              <span>Actividad</span>
              <span className="right">Horas</span>
            </div>
            <ol className="rows">
              {rows.map((m, i) => (
                <Row key={m.id} member={m} rank={i + 1} max={max} index={i} run={inView} icons={icons} />
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  )
}
