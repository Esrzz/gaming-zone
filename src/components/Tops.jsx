import { useMemo, useState } from 'react'
import GameIcon from './GameIcon.jsx'
import { MemberLink } from '../context/MemberContext.jsx'
import { fmtHours } from '../lib/format.js'

// Si las horas jugadas fuera de voz ("Rancho aparte") también cuentan en los tops de juegos.
// Poné false para que esos dos tops muestren solo lo jugado en canales de voz.
const COUNT_OUTSIDE_VOICE = true

const topEntry = (map = {}) => Object.entries(map).sort((a, b) => b[1] - a[1])[0]

// Arma cada top a partir de los datos de los miembros.
function buildTops(members) {
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
      rows: games.map((g) => ({ key: g.game, label: g.game, icon: g.game, sub: split(g), value: g.total })),
    },
    {
      id: 'leaders',
      title: 'Quién lidera cada juego',
      desc: 'Tocá un juego para ver el podio y qué tan cerca están',
      rows: games.map((g) => ({
        key: g.game,
        label: g.game,
        icon: g.game,
        leader: g.leader,
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
      rows: members
        .filter((m) => m.week > 0)
        .sort((a, b) => b.week - a.week)
        .slice(0, 5)
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
      rows: members
        .filter((m) => m.streak > 0)
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 5)
        .map((m) => ({ key: m.id, member: m, value: m.streak, text: `${m.streak} ${m.streak === 1 ? 'día' : 'días'}` })),
    },
    // Siempre al final
    {
      id: 'rancho',
      title: 'Rancho aparte',
      desc: 'Horas jugadas sin estar en un canal de voz. Tocá a alguien para ver todo lo que jugó',
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
  ]
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
      <span>{row.label}</span>
    </>
  )

  return (
    <li
      className={`toprow ${row.icon ? 'has-icon' : ''} ${expandable ? 'expandable' : ''} ${open ? 'row-open' : ''}`}
      style={{ '--i': index, '--p': row.value / max }}
    >
      <div className="toprow-main">
        {row.toggleOnLabel ? (
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

        {row.leader && (
          <span className="sub leader">
            <MemberLink id={row.leader.id} name={row.leader.name} />
            {row.leader.live && <i className="live-dot" title="Está jugando ahora" />}
          </span>
        )}
        {row.sub && <span className="sub">{row.sub}</span>}
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

function Item({ top, open, onToggle, icons }) {
  const max = Math.max(...top.rows.map((r) => r.value), 1)
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
          {top.rows.length === 0 ? (
            <p className="empty-note">Todavía no hay datos para este top.</p>
          ) : (
            <ol className={`toplist ${top.rows.length > 6 && !top.rows.some((r) => r.detail) ? 'cols' : ''}`}>
              {top.rows.map((r, i) => (
                <TopRow key={r.key} row={r} index={i} max={max} icons={icons} id={top.id} />
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Tops({ members, icons }) {
  const tops = useMemo(() => buildTops(members), [members])
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
