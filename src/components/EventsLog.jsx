import { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import GameIcon from './GameIcon.jsx'
import GameMedal from './GameMedal.jsx'
import { MemberLink } from '../context/MemberContext.jsx'
import { RECORDS } from '../data/records.js'
import { fmtAgo, fmtDate } from '../lib/format.js'

const FILTERS = [
  { id: 'all', label: 'Todo' },
  { id: 'records', label: 'Récords', kinds: ['record', 'tie'] },
  { id: 'games', label: 'Juegos', kinds: ['master', 'podium'] },
]
const DAY = 86_400_000
const BY_ID = Object.fromEntries(RECORDS.map((r) => [r.id, r]))
const TIER = ['gold', 'silver', 'bronze']

// Una o varias personas (o un juego, en "Máquina del Janeo"), con enlace a su ficha
function Names({ list = [], names }) {
  return list.map((p, i) => (
    <span key={`${p.id ?? p.n}-${i}`}>
      {i > 0 && (i === list.length - 1 ? ' y ' : ', ')}
      {p.id ? <MemberLink id={p.id} name={names[p.id] ?? p.n} /> : <strong>{p.n}</strong>}
    </span>
  ))
}

function Thumb({ e, icons }) {
  if (e.k === 'master' || e.k === 'podium') {
    const tier = TIER[(e.k === 'master' ? 1 : e.rank) - 1]
    return <GameMedal game={e.game} icons={icons} tier={tier} size={56} />
  }
  const r = BY_ID[e.rid]
  return <span className="ev-medal" style={r ? { backgroundImage: `url(${r.image})` } : undefined} aria-hidden="true" />
}

function Body({ e, names, icons }) {
  const r = BY_ID[e.rid]
  const title = r?.title ?? e.rid
  const fmt = (v) => (r?.format ? r.format(v) : String(v))
  if (e.k === 'record') {
    return (
      <>
        <p><Names list={e.who} names={names} /> le sacó <b>{title}</b> a <Names list={e.from} names={names} /></p>
        <small>{fmt(e.v)} · antes {fmt(e.pv)}</small>
      </>
    )
  }
  if (e.k === 'tie') {
    return (
      <>
        <p><Names list={e.who} names={names} /> igualó <b>{title}</b></p>
        <small>{fmt(e.v)}</small>
      </>
    )
  }
  if (e.k === 'master') {
    return (
      <>
        <p>
          <Names list={e.who} names={names} /> es el nuevo Master de <b>{e.game}</b>
          {e.from?.length > 0 && <> y le sacó el título a <Names list={e.from} names={names} /></>}
        </p>
        <small className="ev-game"><GameIcon name={e.game} icons={icons} size={16} round /> Medalla de oro</small>
      </>
    )
  }
  return (
    <>
      <p><Names list={e.who} names={names} /> entró al podio de <b>{e.game}</b></p>
      <small className="ev-game"><GameIcon name={e.game} icons={icons} size={16} round /> {e.rank === 2 ? 'Medalla de plata' : 'Medalla de bronce'}</small>
    </>
  )
}

export default function EventsLog({ events, members, icons, onClose }) {
  const [filter, setFilter] = useState('all')
  const names = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members])
  const kinds = FILTERS.find((f) => f.id === filter).kinds
  const list = useMemo(() => (kinds ? events.filter((e) => kinds.includes(e.k)) : events), [events, kinds])
  const now = Date.now()

  return (
    <Modal
      title="Novedades"
      onClose={onClose}
      header={
        <div className="grow">
          <h2>Novedades</h2>
          <p>Récords superados y cambios en el podio de los juegos</p>
        </div>
      }
    >
      <div className="ev-filters" role="group" aria-label="Filtrar novedades">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={filter === f.id ? 'on' : ''} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="modal-note">
          {events.length === 0
            ? 'Todavía no hay novedades. Aparecen cuando alguien supera un récord o entra al podio de un juego.'
            : 'No hay novedades de este tipo.'}
        </p>
      ) : (
        <ul className="evlist">
          {list.map((e, i) => (
            <li key={`${e.t}-${i}`} className={now - e.t < DAY ? 'fresh' : ''}>
              <Thumb e={e} icons={icons} />
              <div className="ev-text">
                <Body e={e} names={names} icons={icons} />
              </div>
              <time dateTime={new Date(e.t).toISOString()} title={fmtDate(e.t)}>{fmtAgo(e.t, now)}</time>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
