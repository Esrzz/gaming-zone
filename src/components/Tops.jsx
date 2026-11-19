import { TIER_LABEL } from './GameMedal.jsx'
import { useMemo, useState } from 'react'
import GameIcon from './GameIcon.jsx'
import Collapse, { MoreButton } from './Collapse.jsx'
import { MemberLink } from '../context/MemberContext.jsx'
import { fmtHours } from '../lib/format.js'
import { trackUrl, artistUrl } from '../lib/spotify.js'

// Si las horas jugadas fuera de voz ("Rancho aparte") también cuentan en los tops de juegos.
// Poné false para que esos dos tops muestren solo lo jugado en canales de voz.
const COUNT_OUTSIDE_VOICE = true

const topEntry = (map = {}) => Object.entries(map).sort((a, b) => b[1] - a[1])[0]

// Arma cada top a partir de los datos de los miembros.
function buildTops(members, music, masters = []) {
  const masterOf = Object.fromEntries(masters.filter((m) => m.rank === 1).map((m) => [m.game, m]))
  // Por juego: quién jugó cuánto, separando lo jugado en voz y fuera de voz
  const perGame = {}
  const put = (game, m, key, h) => {
    const list = (perGame[game] ??= new Map())
    const e = list.get(m.id) ?? { id: m.id, name: m.name, voice: 0, out: 0, live: false }
    e[key] += h
    e.live = m.activity?.name === game
    list.set(m.id, e)
  }
  for (const m of members) {
    for (const [game, h] of Object.entries(m.games ?? {})) put(game, m, 'voice', h)
    if (COUNT_OUTSIDE_VOICE) {
      for (const [game, h] of Object.entries(m.ranchoGames ?? {})) put(game, m, 'out', h)
    }
  }
  const games = Object.entries(perGame)
    .map(([game, map]) => {
      const list = [...map.values()].map((e) => ({ ...e, h: e.voice + e.out }))
      const sorted = [...list].sort((a, b) => b.h - a.h)
      return {
        game,
        total: list.reduce((s, x) => s + x.h, 0),
        voice: list.reduce((s, x) => s + x.voice, 0),
        out: list.reduce((s, x) => s + x.out, 0),
        players: list.length,
        leader: sorted[0],
        podium: sorted.slice(0, 3),
      }
    })
    .sort((a, b) => b.total - a.total)

  const split = (g) => {
    const people = `${g.players} ${g.players === 1 ? 'jugador' : 'jugadores'}`
    if (!COUNT_OUTSIDE_VOICE || g.out === 0) return people
    if (g.voice === 0) return `${people} · todo fuera de voz`
    return `${people} · ${fmtHours(g.voice)} en voz, ${fmtHours(g.out)} fuera`
  }

  // Detalle de un juego: los 3 que más aportaron y qué tan cerca están del líder
  const podium = (g) =>
    g.podium.map((p, i) => ({
      key: p.id,
      member: { id: p.id, name: p.name },
      live: p.live,
      value: p.h,
      share: p.h / g.podium[0].h,
      note: i === 0 ? 'Líder' : `a ${fmtHours(g.podium[0].h - p.h)} del líder`,
    }))

  return [
    {
      id: 'games',
      title: 'Juegos con más horas',
      desc: COUNT_OUTSIDE_VOICE
        ? 'Todos los juegos que se jugaron, dentro y fuera de voz'
        : 'Todos los juegos que se jugaron en voz',
      noun: ['juego', 'juegos'],
      limit: 20, // hay muchos juegos: los 20 primeros y el resto a pedido
      rows: games.map((g) => ({ key: g.game, label: g.game, icon: g.game, sub: split(g), value: g.total })),
    },
    {
      id: 'leaders',
      title: 'Quién lidera cada juego',
      desc: 'Tocá un juego para ver el podio y qué tan cerca están',
      noun: ['juego', 'juegos'],
      limit: 10, // cada fila es más alta (líder y podio), así que menos a la vez
      rows: games.map((g) => ({
        key: g.game,
        label: g.game,
        icon: g.game,
        leader: g.leader,
        master: masterOf[g.game]?.id === g.leader.id ? masterOf[g.game].tier : null,
        value: g.leader.h,
        toggleOnLabel: true,
        detail: podium(g),
        detailNote: g.players > 3 ? `Y ${g.players - 3} más jugaron este juego` : '',
      })),
    },
    {
      id: 'week',
      title: 'Más activos esta semana',
      desc: 'Horas en voz en los últimos 7 días',
      noun: ['persona', 'personas'],
      limit: 10,
      rows: members
        .filter((m) => m.week > 0)
        .sort((a, b) => b.week - a.week)
        .map((m) => ({
          key: m.id,
          member: m,
          value: m.week,
          sub: m.today > 0 ? `${fmtHours(m.today)} hoy` : 'Hoy todavía no entró',
        })),
    },
    {
      id: 'streak',
      title: 'Rachas más largas',
      desc: 'Días seguidos entrando a voz',
      noun: ['persona', 'personas'],
      limit: 10,
      rows: members
        .filter((m) => m.streak > 0)
        .sort((a, b) => b.streak - a.streak)
        .map((m) => ({ key: m.id, member: m, value: m.streak, text: `${m.streak} ${m.streak === 1 ? 'día' : 'días'}` })),
    },
    // Siempre al final
    {
      id: 'rancho',
      title: 'Rancho aparte',
      desc: 'Horas jugadas sin estar en un canal de voz. Tocá a alguien para ver todo lo que jugó',
      noun: ['persona', 'personas'],
      limit: 10,
      rows: members
        .filter((m) => m.rancho > 0)
        .sort((a, b) => b.rancho - a.rancho)
        .map((m) => {
          const [topGame] = topEntry(m.ranchoGames) ?? []
          const entries = Object.entries(m.ranchoGames ?? {}).sort((a, b) => b[1] - a[1])
          return {
            key: m.id,
            member: m,
            value: m.rancho,
            favorite: topGame,
            // SOLO lo jugado fuera de voz
            detail: entries.map(([game, h]) => ({ key: game, game, value: h, share: h / entries[0][1] })),
          }
        }),
    },
    // Debajo de Rancho aparte
    buildMusicTop(members, music),
  ]
}

// Quiénes escuchan más: podio de 3, igual que en los juegos
const listenerPodium = (top) =>
  top.map((p, i) => ({
    key: p.id,
    member: { id: p.id, name: p.name },
    value: p.hours,
    share: p.hours / top[0].hours,
    note: i === 0 ? 'El que más lo escucha' : `a ${fmtHours(top[0].hours - p.hours)} del primero`,
  }))

function buildMusicTop(members, music) {
  const listeners = members.filter((m) => m.music?.hours > 0).sort((a, b) => b.music.hours - a.music.hours)
  const toRow = (x, key, extra) => ({
    key,
    cover: x.image ?? '',
    value: x.hours,
    leader: x.top?.[0] ? { id: x.top[0].id, name: x.top[0].name, hours: x.top[0].hours } : null,
    leaderPrefix: 'Lo escucha más',
    detail: x.top?.length > 1 ? listenerPodium(x.top) : null,
    toggleOnLabel: x.top?.length > 1,
    detailNote: x.listeners > 3 ? `Y ${x.listeners - 3} más lo escucharon` : '',
    ...extra,
  })
  return {
    id: 'music',
    title: 'Música',
    desc: music?.hours
      ? `${fmtHours(music.hours)} de Spotify entre ${music.people} ${music.people === 1 ? 'persona' : 'personas'}`
      : 'Lo que escuchamos en Spotify',
    sections: [
      {
        title: 'Artistas más escuchados',
        noun: ['artista', 'artistas'],
        rows: (music?.artists ?? []).map((a) => toRow(a, a.name, { label: a.name, round: true, href: artistUrl(a.name) })),
      },
      {
        title: 'Canciones más escuchadas',
        noun: ['canción', 'canciones'],
        rows: (music?.songs ?? []).map((s) => toRow(s, `${s.artist}-${s.title}`, { label: s.title, sub: s.artist, href: trackUrl(s) })),
      },
      {
        title: 'Quién escucha más música',
        noun: ['persona', 'personas'],
        rows: listeners.map((m) => ({
          key: m.id,
          member: m,
          value: m.music.hours,
          sub: m.music.artists[0] ? `Artista favorito: ${m.music.artists[0].name}` : '',
        })),
      },
    ],
  }
}

function Chevron({ size = 20 }) {
  return (
    <svg className="chev" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Detail({ items, icons, note }) {
  return (
    <ul className="detail-list">
      {items.map((d) => (
        <li key={d.key} style={{ '--p': d.share }}>
          <span className="d-name">
            {d.game ? (
              <>
                <GameIcon name={d.game} icons={icons} size={22} />
                <span>{d.game}</span>
              </>
            ) : (
              <>
                <MemberLink id={d.member.id} name={d.member.name} />
                {d.live && <i className="live-dot" title="Está jugando ahora" />}
              </>
            )}
          </span>
          <span className="d-val">{fmtHours(d.value)}</span>
          {d.note && <span className="d-note">{d.note}</span>}
          <span className="bar"><i /></span>
        </li>
      ))}
      {note && <li className="d-more">{note}</li>}
    </ul>
  )
}

function TopRow({ row, index, max, icons, id }) {
  const [open, setOpen] = useState(false)
  const expandable = Boolean(row.detail?.length)
  const detailId = `d-${id}-${index}`

  const label = row.member ? (
    <MemberLink id={row.member.id} name={row.member.name} />
  ) : (
    <>
      {row.icon && <GameIcon name={row.icon} icons={icons} />}
      {row.cover !== undefined && <GameIcon name={row.label} src={row.cover || undefined} size={34} round={row.round} />}
      <span>{row.label}</span>
    </>
  )

  const labelEl = row.toggleOnLabel ? (
<button
            type="button"
            className="lbl lbl-btn"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={() => setOpen(!open)}
          >
            {label}
          </button>
        ) : (
          <span className="lbl">{label}</span>
  )

  return (
    <li
      className={`toprow ${row.icon || row.cover !== undefined ? 'has-icon' : ''} ${expandable ? 'expandable' : ''} ${open ? 'row-open' : ''}`}
      style={{ '--i': index, '--p': row.value / max }}
    >
      <div className="toprow-main">
        {row.href ? (
          <span className="lblrow">
            {labelEl}
            <a
              className="ext"
              href={row.href}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en Spotify"
              aria-label={`Abrir ${row.label} en Spotify (se abre en otra pestaña)`}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </span>
        ) : (
          labelEl
        )}
        <span className="val">{row.text ?? fmtHours(row.value)}</span>
        {expandable && !row.toggleOnLabel && (
          <button
            type="button"
            className="expander"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={`Ver detalle de ${row.member?.name ?? row.label}`}
            onClick={() => setOpen(!open)}
          >
            <Chevron size={18} />
          </button>
        )}
        {expandable && row.toggleOnLabel && (
          <button type="button" className="expander" tabIndex={-1} aria-hidden="true" onClick={() => setOpen(!open)}>
            <Chevron size={18} />
          </button>
        )}

        {row.sub && <span className="sub">{row.sub}</span>}
        {row.leader && (
          <span className="sub leader">
            {row.leaderPrefix && <small className="pre">{row.leaderPrefix}</small>}
            <MemberLink id={row.leader.id} name={row.leader.name} />
            {row.master && <span className={`mtag tier-${row.master}`} title={`Master de ${row.label} (${TIER_LABEL[row.master]})`}>Master</span>}
            {row.leader.live && <i className="live-dot" title="Está jugando ahora" />}
          </span>
        )}
        {row.favorite && (
          <span className="sub fav">
            Más jugado: <GameIcon name={row.favorite} icons={icons} size={18} /> <strong>{row.favorite}</strong>
          </span>
        )}
        <span className="bar"><i /></span>
      </div>

      {expandable && (
        <div className="rdetail" id={detailId} role="region">
          <div className="rdetail-inner">
            <Detail items={row.detail} icons={icons} note={row.detailNote} />
          </div>
        </div>
      )}
    </li>
  )
}

// Lista con un tramo a la vista. Después: "Ver N más" (de a un tramo), "Mostrar lista completa" y "Mostrar menos".
function TopList({ rows, icons, id, limit = 10, step = limit, noun = ['elemento', 'elementos'] }) {
  const [shown, setShown] = useState(limit)
  const max = Math.max(...rows.map((r) => r.value), 1)
  const cols = rows.length > 6 && !rows.some((r) => r.detail) ? 'cols' : ''
  const visible = Math.min(shown, rows.length)
  const remaining = rows.length - visible
  const next = Math.min(step, remaining)
  return (
    <>
      <ol className={`toplist ${cols}`}>
        {rows.slice(0, visible).map((r, i) => (
          <TopRow key={r.key} row={r} index={Math.min(i, 8)} max={max} icons={icons} id={id} />
        ))}
      </ol>
      {(remaining > 0 || visible > limit) && (
        <div className="list-actions">
          {remaining > 0 && (
            <button type="button" className="more-btn" onClick={() => setShown(visible + step)}>
              Ver {next} {next === 1 ? noun[0] : noun[1]} más
              <Chevron size={16} />
            </button>
          )}
          {remaining > step && (
            <button type="button" className="more-btn" onClick={() => setShown(rows.length)}>
              Mostrar lista completa ({rows.length})
            </button>
          )}
          {visible > limit && (
            <button type="button" className="more-btn" onClick={() => setShown(limit)}>
              Mostrar menos
            </button>
          )}
        </div>
      )}
    </>
  )
}

function Item({ top, open, onToggle, icons }) {
  return (
    <div className={`acc ${open ? 'open' : ''}`}>
      <h3>
        <button id={`b-${top.id}`} aria-expanded={open} aria-controls={`p-${top.id}`} onClick={onToggle}>
          <span className="acc-title">
            <strong>{top.title}</strong>
            <small>{top.desc}</small>
          </span>
          <Chevron />
        </button>
      </h3>
      <div className="panel" id={`p-${top.id}`} role="region" aria-labelledby={`b-${top.id}`}>
        <div className="panel-inner">
          {top.sections ? (
            top.sections.every((sec) => sec.rows.length === 0) ? (
              <p className="empty-note">Todavía no hay datos. Aparecen cuando alguien escucha Spotify con Discord abierto.</p>
            ) : (
              top.sections.map((sec, si) =>
                sec.rows.length === 0 ? null : (
                  <section className="subtop" key={sec.title}>
                    <h4>{sec.title}</h4>
                    <TopList rows={sec.rows} icons={icons} id={`${top.id}${si}`} limit={10} noun={sec.noun} />
                  </section>
                ),
              )
            )
          ) : top.rows.length === 0 ? (
            <p className="empty-note">Todavía no hay datos para este top.</p>
          ) : (
            <TopList rows={top.rows} icons={icons} id={top.id} limit={top.limit} noun={top.noun} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function Tops({ members, icons, music, masters }) {
  const tops = useMemo(() => buildTops(members, music, masters), [members, music, masters])
  const [openId, setOpenId] = useState(tops[0]?.id)

  return (
    <section className="section wrap" id="tops">
      <div className="section-head">
        <h2>Otros tops</h2>
        <p>Abrí cada uno para ver el detalle.</p>
      </div>
      <div className="accs">
        {tops.map((t) => (
          <Item
            key={t.id}
            top={t}
            open={openId === t.id}
            icons={icons}
            onToggle={() => setOpenId(openId === t.id ? null : t.id)}
          />
        ))}
      </div>
    </section>
  )
}
