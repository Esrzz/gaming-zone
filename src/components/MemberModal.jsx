import Modal from './Modal.jsx'
import Avatar from './Avatar.jsx'
import GameIcon from './GameIcon.jsx'
import { MemberLink } from '../context/MemberContext.jsx'
import { STATUS_LABEL, fmtDate, fmtHours, fmtMinutes } from '../lib/format.js'

function GameList({ games, icons }) {
  const entries = Object.entries(games ?? {}).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  const max = entries[0][1]
  return (
    <ul className="mlist">
      {entries.map(([game, h]) => (
        <li key={game} style={{ '--p': h / max }}>
          <span className="who">
            <GameIcon name={game} icons={icons} size={24} />
            <span>{game}</span>
          </span>
          <span className="val">{fmtHours(h)}</span>
          <span className="bar"><i /></span>
        </li>
      ))}
    </ul>
  )
}

export default function MemberModal({ member, icons, onClose }) {
  const s = member.sessions
  const hasGames = Object.keys(member.games ?? {}).length > 0
  const hasRancho = Object.keys(member.ranchoGames ?? {}).length > 0
  const together = member.together ?? []
  const maxTogether = together[0]?.hours || 1

  return (
    <Modal
      title={`Ficha de ${member.name}`}
      onClose={onClose}
      header={
        <>
          <Avatar member={member} />
          <div className="grow">
            <h2>{member.name}</h2>
            <p>
              {member.inVoice && <span className="pill live">En voz ahora</span>}
              <span>{STATUS_LABEL[member.status] ?? STATUS_LABEL.offline}</span>
              {member.activity && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  · {member.activity.verb} <GameIcon name={member.activity.name} icons={icons} size={18} />
                  <strong style={{ color: 'var(--cyan)' }}>{member.activity.name}</strong>
                </span>
              )}
            </p>
          </div>
        </>
      }
    >
      <dl className="tiles">
        <div className="tile"><dd>{fmtHours(member.hours)}</dd><dt>En voz en total</dt></div>
        <div className="tile"><dd>{fmtHours(member.week)}</dd><dt>Últimos 7 días</dt></div>
        <div className="tile"><dd>{fmtHours(member.today ?? 0)}</dd><dt>Hoy</dt></div>
        <div className="tile"><dd>{member.streak} {member.streak === 1 ? 'día' : 'días'}</dd><dt>Racha</dt></div>
        <div className="tile"><dd>{fmtHours(member.rancho)}</dd><dt>Rancho aparte</dt></div>
      </dl>

      <section>
        <h3>Sesiones en voz</h3>
        {s && s.count > 0 ? (
          <>
            <dl className="tiles" style={{ marginBottom: 14 }}>
              <div className="tile"><dd>{s.count}</dd><dt>Sesiones registradas</dt></div>
              <div className="tile"><dd>{fmtHours(s.average)}</dd><dt>Duración promedio</dt></div>
              <div className="tile"><dd>{fmtHours(s.longest)}</dd><dt>La más larga</dt></div>
            </dl>
            <ul className="mlist sess">
              {s.recent.map((x) => (
                <li key={x.start}>
                  <span className="who when">{fmtDate(x.start)}</span>
                  <span className="val">
                    {x.live && <span className="pill live" style={{ marginRight: 8 }}>En curso</span>}
                    {fmtMinutes(x.minutes)}
                  </span>
                  <span className="meta game">
                    {x.game ? (
                      <>
                        <GameIcon name={x.game} icons={icons} size={18} /> {x.game}
                      </>
                    ) : (
                      'Sin juego'
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="modal-note">Todavía no hay sesiones completas registradas. Aparecen cuando alguien sale de un canal de voz.</p>
        )}
      </section>

      <section>
        <h3>Juegos en voz</h3>
        {hasGames ? <GameList games={member.games} icons={icons} /> : <p className="modal-note">Todavía no jugó nada en voz.</p>}
      </section>

      {hasRancho && (
        <section>
          <h3>Rancho aparte</h3>
          <GameList games={member.ranchoGames} icons={icons} />
        </section>
      )}

      <section>
        <h3>Comparte sesión con</h3>
        {together.length ? (
          <ul className="mlist">
            {together.map((t) => (
              <li key={t.id} style={{ '--p': t.hours / maxTogether }}>
                <span className="who">
                  <Avatar member={{ ...t, status: 'offline' }} />
                  <MemberLink id={t.id} name={t.name} />
                </span>
                <span className="val">{fmtHours(t.hours)}</span>
                <span className="meta">juntos en el mismo canal de voz</span>
                <span className="bar"><i /></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="modal-note">Todavía no hay horas compartidas con otras personas.</p>
        )}
      </section>
    </Modal>
  )
}
