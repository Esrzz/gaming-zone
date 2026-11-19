import { useState } from 'react'
import Modal from './Modal.jsx'
import Collapse, { MoreButton } from './Collapse.jsx'
import { RECORDS } from '../data/records.js'
import Avatar from './Avatar.jsx'
import GameIcon from './GameIcon.jsx'
import GameMedal, { TIER_LABEL, RANK_LABEL } from './GameMedal.jsx'
import ConnectionChips from './ConnectionChips.jsx'
import { MemberLink } from '../context/MemberContext.jsx'
import { trackUrl, artistUrl } from '../lib/spotify.js'
import { STATUS_LABEL, fmtDate, fmtHours, fmtMinutes } from '../lib/format.js'

const GAME_LIMIT = 20
const MASTER_LIMIT = 6
const SESSION_LIMIT = 3

function SessionRow({ x, icons }) {
  return (
    <li>
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
  )
}

// Las últimas 3 sesiones a la vista y el resto desplegable
function SessionList({ recent, icons }) {
  const [more, setMore] = useState(false)
  const first = recent.slice(0, SESSION_LIMIT)
  const rest = recent.slice(SESSION_LIMIT)
  return (
    <>
      <ul className="mlist sess">
        {first.map((x) => <SessionRow key={x.start} x={x} icons={icons} />)}
      </ul>
      {rest.length > 0 && (
        <>
          <Collapse open={more} id="sessions-more">
            <ul className="mlist sess" style={{ marginTop: 8 }}>
              {rest.map((x) => <SessionRow key={x.start} x={x} icons={icons} />)}
            </ul>
          </Collapse>
          <MoreButton open={more} onClick={() => setMore(!more)} controls="sessions-more" more={`Ver ${rest.length} ${rest.length === 1 ? 'sesión más' : 'sesiones más'}`} less="Ocultar" />
        </>
      )}
    </>
  )
}

function MasterCard({ m, icons }) {
  return (
    <li className={`mcard tier-${m.tier}`}>
      <GameMedal game={m.game} icons={icons} tier={m.tier} size={76} />
      <span className="mc-text">
        <small>{RANK_LABEL[m.rank]} · {TIER_LABEL[m.tier]}</small>
        <strong>{m.game}</strong>
        <span>{fmtHours(m.hours)} · de {m.players} jugadores</span>
      </span>
    </li>
  )
}

// Medallas de podio de la persona (Master = 1.º): las 6 mejores a la vista y el resto desplegable
function MasterSection({ list, icons }) {
  const [more, setMore] = useState(false)
  const first = list.slice(0, MASTER_LIMIT)
  const rest = list.slice(MASTER_LIMIT)
  return (
    <section>
      <h3>Podio de juegos ({list.length})</h3>
      <ul className="masters">
        {first.map((m) => <MasterCard key={m.game} m={m} icons={icons} />)}
      </ul>
      {rest.length > 0 && (
        <>
          <Collapse open={more} id="masters-more">
            <ul className="masters" style={{ marginTop: 8 }}>
              {rest.map((m) => <MasterCard key={m.game} m={m} icons={icons} />)}
            </ul>
          </Collapse>
          <MoreButton open={more} onClick={() => setMore(!more)} controls="masters-more" more={`Ver ${rest.length} más`} less="Ocultar" />
        </>
      )}
    </section>
  )
}

function GameRow({ game, h, max, icons }) {
  return (
    <li style={{ '--p': h / max }}>
      <span className="who">
        <GameIcon name={game} icons={icons} size={24} />
        <span>{game}</span>
      </span>
      <span className="val">{fmtHours(h)}</span>
      <span className="bar"><i /></span>
    </li>
  )
}

// Muestra hasta 20 juegos; si hay más, el resto queda en un desplegable
function GameList({ games, icons, id }) {
  const [more, setMore] = useState(false)
  const entries = Object.entries(games ?? {}).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  const max = entries[0][1]
  const first = entries.slice(0, GAME_LIMIT)
  const rest = entries.slice(GAME_LIMIT)
  return (
    <>
      <ul className="mlist">
        {first.map(([game, h]) => <GameRow key={game} game={game} h={h} max={max} icons={icons} />)}
      </ul>
      {rest.length > 0 && (
        <>
          <MoreButton
            open={more}
            controls={id}
            onClick={() => setMore(!more)}
            more={`Ver ${rest.length} ${rest.length === 1 ? 'juego más' : 'juegos más'}`}
            less="Ocultar el resto"
          />
          <Collapse open={more} id={id}>
            <ul className="mlist" style={{ paddingTop: 12 }}>
              {rest.map(([game, h]) => <GameRow key={game} game={game} h={h} max={max} icons={icons} />)}
            </ul>
          </Collapse>
        </>
      )}
    </>
  )
}

function MusicSection({ music }) {
  const [more, setMore] = useState(false)
  const artist = music.artists[0]
  const song = music.songs[0]
  const extra = Math.max(music.artists.length, music.songs.length) > 1

  return (
    <section>
      <h3>Música en Spotify</h3>
      <ul className="mlist">
        <li>
          <span className="who"><span>Escuchó en total</span></span>
          <span className="val">{fmtHours(music.hours)}</span>
        </li>
        {artist && (
          <li>
            <span className="who">
              <GameIcon name={artist.name} src={artist.image || undefined} size={30} round />
              <a className="tlink" href={artistUrl(artist.name)} target="_blank" rel="noopener noreferrer" title="Abrir en Spotify">{artist.name}</a>
            </span>
            <span className="val">{fmtHours(artist.hours)}</span>
            <span className="meta">Artista más escuchado</span>
          </li>
        )}
        {song && (
          <li>
            <span className="who">
              <GameIcon name={song.title} src={song.image || undefined} size={30} />
              <a className="tlink" href={trackUrl(song)} target="_blank" rel="noopener noreferrer" title="Abrir en Spotify">{song.title}</a>
            </span>
            <span className="val">{fmtHours(song.hours)}</span>
            <span className="meta">Canción más escuchada · {song.artist}</span>
          </li>
        )}
      </ul>

      {extra && (
        <>
          <button
            type="button"
            className="more-btn"
            aria-expanded={more}
            aria-controls="music-more"
            onClick={() => setMore(!more)}
          >
            {more ? 'Ocultar lista' : 'Ver artistas y canciones'}
            <svg className="chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{ transform: more ? 'rotate(180deg)' : 'none' }}>
              <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className={`rdetail ${more ? 'show' : ''}`} id="music-more">
            <div className="rdetail-inner">
              <div style={{ display: 'grid', gap: 16, paddingTop: 12 }}>
                {music.artists.length > 0 && (
                  <div>
                    <p className="modal-note" style={{ marginBottom: 8 }}>Artistas</p>
                    <ul className="mlist">
                      {music.artists.map((a) => (
                        <li key={a.name} style={{ '--p': a.hours / music.artists[0].hours }}>
                          <span className="who">
                            <GameIcon name={a.name} src={a.image || undefined} size={26} round />
                            <a className="tlink" href={artistUrl(a.name)} target="_blank" rel="noopener noreferrer" tabIndex={more ? 0 : -1}>{a.name}</a>
                          </span>
                          <span className="val">{fmtHours(a.hours)}</span>
                          <span className="bar"><i /></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {music.songs.length > 0 && (
                  <div>
                    <p className="modal-note" style={{ marginBottom: 8 }}>Canciones</p>
                    <ul className="mlist">
                      {music.songs.map((x) => (
                        <li key={`${x.artist}-${x.title}`} style={{ '--p': x.hours / music.songs[0].hours }}>
                          <span className="who">
                            <GameIcon name={x.title} src={x.image || undefined} size={26} />
                            <a className="tlink" href={trackUrl(x)} target="_blank" rel="noopener noreferrer" tabIndex={more ? 0 : -1}>{x.title}</a>
                          </span>
                          <span className="val">{fmtHours(x.hours)}</span>
                          <span className="meta">{x.artist}</span>
                          <span className="bar"><i /></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default function MemberModal({ member, members = [], masters = [], connections, icons, onClose }) {
  const statusById = Object.fromEntries(members.map((m) => [m.id, m.status]))
  const medals = RECORDS.filter((r) => member.medals?.includes(r.id))
  const mine = masters.filter((m) => m.id === member.id) // ya vienen ordenadas: oro, plata, bronce
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
            {member.listening && (
              <p>
                Escuchando <strong style={{ color: 'var(--cyan)' }}>{member.listening.title}</strong> · {member.listening.artist}
              </p>
            )}
          </div>
        </>
      }
    >
      <ConnectionChips list={connections} />

      <dl className="tiles">
        <div className="tile"><dd>{fmtHours(member.hours)}</dd><dt>En voz en total</dt></div>
        <div className="tile"><dd>{fmtHours(member.week)}</dd><dt>Últimos 7 días</dt></div>
        <div className="tile"><dd>{fmtHours(member.today ?? 0)}</dd><dt>Hoy</dt></div>
        <div className="tile"><dd>{member.streak} {member.streak === 1 ? 'día' : 'días'}</dd><dt>Racha</dt></div>
        <div className="tile"><dd>{fmtHours(member.rancho)}</dd><dt>Rancho aparte</dt></div>
      </dl>

      {medals.length > 0 && (
        <section>
          <h3>Medallas ({medals.length})</h3>
          <ul className="medals">
            {medals.map((r) => (
              <li key={r.id}>
                <img src={r.image} alt={`${r.title}: ${r.short}`} width="720" height="240" loading="lazy" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {mine.length > 0 && <MasterSection list={mine} icons={icons} />}

      <section>
        <h3>Sesiones en voz</h3>
        {s && s.count > 0 ? (
          <>
            <dl className="tiles" style={{ marginBottom: 14 }}>
              <div className="tile"><dd>{s.count}</dd><dt>Sesiones registradas</dt></div>
              <div className="tile"><dd>{fmtHours(s.average)}</dd><dt>Duración promedio</dt></div>
              <div className="tile"><dd>{fmtHours(s.longest)}</dd><dt>La más larga</dt></div>
            </dl>
            <SessionList recent={s.recent} icons={icons} />
          </>
        ) : (
          <p className="modal-note">Todavía no hay sesiones completas registradas. Aparecen cuando alguien sale de un canal de voz.</p>
        )}
      </section>

      <section>
        <h3>Juegos en voz</h3>
        {hasGames ? <GameList games={member.games} icons={icons} id="games-more" /> : <p className="modal-note">Todavía no jugó nada en voz.</p>}
      </section>

      {hasRancho && (
        <section>
          <h3>Rancho aparte</h3>
          <GameList games={member.ranchoGames} icons={icons} id="rancho-more" />
        </section>
      )}

      {member.music?.hours > 0 && <MusicSection music={member.music} />}

      <section>
        <h3>Comparte sesión con</h3>
        {together.length ? (
          <ul className="mlist">
            {together.map((t) => (
              <li key={t.id} style={{ '--p': t.hours / maxTogether }}>
                <span className="who">
                  <Avatar member={{ ...t, status: statusById[t.id] ?? 'offline' }} />
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
