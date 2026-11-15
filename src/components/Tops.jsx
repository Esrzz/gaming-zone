import { useMemo, useState } from 'react'

const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

const topKey = (map = {}) => Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

// Arma cada top a partir de los datos de los miembros.
function buildTops(members) {
  // Horas por juego, solo las jugadas en canales de voz
  const perGame = {}
  for (const m of members) {
    for (const [game, h] of Object.entries(m.games ?? {})) {
      ;(perGame[game] ??= []).push({ name: m.name, h })
    }
  }
  const games = Object.entries(perGame)
    .map(([game, list]) => {
      const sorted = [...list].sort((a, b) => b.h - a.h)
      return {
        game,
        total: list.reduce((s, x) => s + x.h, 0),
        players: list.length,
        leader: sorted[0],
      }
    })
    .sort((a, b) => b.total - a.total)

  return [
    {
      id: 'games',
      title: 'Juegos con más horas',
      desc: 'Lo que más juega el grupo en voz, sumando a todos',
      rows: games.map((g) => ({
        label: g.game,
        sub: `${g.players} ${g.players === 1 ? 'jugador' : 'jugadores'}`,
        value: g.total,
        unit: 'h',
      })),
    },
    {
      id: 'leaders',
      title: 'Quién lidera cada juego',
      desc: 'El que más horas acumuló en cada uno',
      rows: games.map((g) => ({ label: g.game, sub: g.leader.name, value: g.leader.h, unit: 'h' })),
    },
    {
      id: 'week',
      title: 'Más activos esta semana',
      desc: 'Horas en voz en los últimos 7 días',
      rows: members
        .filter((m) => m.week > 0)
        .sort((a, b) => b.week - a.week)
        .slice(0, 5)
        .map((m) => ({ label: m.name, sub: m.activity ? m.activity.name : '', value: m.week, unit: 'h' })),
    },
    {
      id: 'streak',
      title: 'Rachas más largas',
      desc: 'Días seguidos entrando a voz',
      rows: members
        .filter((m) => m.streak > 0)
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 5)
        .map((m) => ({ label: m.name, sub: '', value: m.streak, unit: m.streak === 1 ? 'día' : 'días' })),
    },
    // Siempre al final
    {
      id: 'rancho',
      title: 'Rancho aparte',
      desc: 'Horas jugadas sin estar en un canal de voz',
      rows: members
        .filter((m) => m.rancho > 0)
        .sort((a, b) => b.rancho - a.rancho)
        .slice(0, 8)
        .map((m) => ({ label: m.name, sub: topKey(m.ranchoGames), value: m.rancho, unit: 'h' })),
    },
  ]
}

function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Item({ top, open, onToggle }) {
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
            <ol className="toplist">
              {top.rows.map((r, i) => (
                <li className="toprow" key={r.label} style={{ '--i': i, '--p': r.value / max }}>
                  <span className="lbl">{r.label}</span>
                  <span className="val">
                    {nf.format(r.value)} {r.unit}
                  </span>
                  {r.sub && <span className="sub">{r.sub}</span>}
                  <span className="bar"><i /></span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Tops({ members }) {
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
            onToggle={() => setOpenId(openId === t.id ? null : t.id)}
          />
        ))}
      </div>
    </section>
  )
}
