// Récords: el mejor valor de cada categoría y quién (o quiénes) lo tiene.
// Se guardan en el archivo de datos, así que sobreviven aunque cambien las horas o alguien se vaya.
//
// Para agregar un récord nuevo: sumar una definición acá (id, tipo de dato, mínimo y cómo se calcula)
// y, en la página, su título, descripción e imagen en src/data/records.js con el mismo id.

import { weekSeconds, streakDays, dayKey } from './tracker.js'
import { addEvent } from './events.js'

const HOUR = 3600
const keys = (o) => Object.keys(o ?? {})

// kind: 'hours' (se guarda en segundos), 'days', 'count'
// min: valor mínimo para que cuente (evita premiar cosas triviales al principio)
// candidates(ctx) -> [{ id | game, value, extra? }]
export const RECORD_DEFS = [
  {
    id: 'gamer', // El gamer definitivo: más horas en voz en total
    kind: 'hours',
    min: HOUR,
    candidates: ({ members }) => members.map(({ id, rec }) => ({ id, value: rec.voice ?? 0 })),
  },
  {
    id: 'sonambulo', // sesión en voz más larga
    kind: 'hours',
    min: 10 * 60,
    candidates: ({ members }) =>
      members.map(({ id, rec }) => ({
        id,
        value: Math.max(rec.longest ?? 0, rec.cur ? (rec.cur.e - rec.cur.s) / 1000 : 0),
      })),
  },
  {
    id: 'empleado', // mayor racha de días seguidos en voz
    kind: 'days',
    min: 2,
    candidates: ({ members, today, opts }) =>
      members.map(({ id, rec }) => ({ id, value: streakDays(rec, today, opts.streakMinSeconds) })),
  },
  {
    id: 'jornada', // más horas en voz en 7 días
    kind: 'hours',
    min: HOUR,
    candidates: ({ members, today }) => members.map(({ id, rec }) => ({ id, value: weekSeconds(rec, today) })),
  },
  {
    id: 'coleccionista', // más juegos distintos jugados
    kind: 'count',
    min: 2,
    candidates: ({ members }) =>
      members.map(({ id, rec }) => ({ id, value: new Set([...keys(rec.games), ...keys(rec.ranchoGames)]).size })),
  },
  {
    id: 'otp', // más horas acumuladas en un solo juego (voz + fuera de voz)
    kind: 'hours',
    min: HOUR,
    candidates: ({ members }) =>
      members.map(({ id, rec }) => {
        const total = {}
        for (const [g, s] of Object.entries(rec.games ?? {})) total[g] = (total[g] ?? 0) + s
        for (const [g, s] of Object.entries(rec.ranchoGames ?? {})) total[g] = (total[g] ?? 0) + s
        const [game, value] = Object.entries(total).sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
        return { id, value, extra: { game } }
      }),
  },
  {
    id: 'janeo', // el juego con más horas entre todos (el dueño es un juego)
    kind: 'hours',
    min: HOUR,
    candidates: ({ members }) => {
      const total = {}
      const players = {}
      for (const { rec } of members) {
        const seen = new Set()
        for (const map of [rec.games, rec.ranchoGames]) {
          for (const [g, s] of Object.entries(map ?? {})) {
            total[g] = (total[g] ?? 0) + s
            seen.add(g)
          }
        }
        for (const g of seen) players[g] = (players[g] ?? 0) + 1
      }
      return Object.entries(total).map(([game, value]) => ({ game, value, extra: { players: players[game] } }))
    },
  },
  {
    id: 'fantasma', // más tiempo seguido en un canal de voz sin jugar a nada
    kind: 'hours',
    min: 10 * 60,
    candidates: ({ members }) => members.map(({ id, rec }) => ({ id, value: rec.idleBest ?? 0 })),
  },
  {
    id: 'vibra', // más tiempo escuchando música
    kind: 'hours',
    min: HOUR,
    candidates: ({ members }) => members.map(({ id, rec }) => ({ id, value: rec.music ?? 0 })),
  },
  {
    id: 'shape', // más juegos distintos en una sola sesión (cada uno al menos 5 min)
    kind: 'count',
    min: 2,
    candidates: ({ members }) => members.map(({ id, rec }) => ({ id, value: rec.shapeBest ?? 0 })),
  },
]

const keyOf = (c) => (c.game ? `g:${c.game}` : `m:${c.id}`)
const MAX_HISTORY = 5
const toUnit = (kind, v) => (kind === 'hours' ? Math.round((v / 3600) * 100) / 100 : v) // igual que lo que ve la página
const who = (list) => list.map((h) => (h.game ? { n: h.game } : { id: h.id, n: h.name }))

// Revisa cada categoría con los datos actuales y actualiza los récords guardados.
// Un récord solo cambia de dueño cuando alguien lo SUPERA; si empatan, comparten.
export function updateRecords(store, snapshot, now, opts) {
  store.records ??= {}
  const live = new Map(snapshot.map((m) => [m.id, m]))
  const members = Object.entries(store.members)
    .filter(([id]) => live.has(id))
    .map(([id, rec]) => ({ id, rec }))
  const ctx = { members, today: dayKey(now, opts.timezone), opts }
  let changed = false

  for (const def of RECORD_DEFS) {
    const cands = def.candidates(ctx).map((c) => ({ ...c, value: Math.round(c.value) }))
    const best = Math.max(0, ...cands.map((c) => c.value))
    if (best < def.min) continue
    const winners = cands.filter((c) => c.value === best)
    const toHolder = (c) => ({
      ...(c.game ? { game: c.game } : { id: c.id, name: live.get(c.id)?.name ?? store.members[c.id]?.name }),
      ...(c.extra ? { extra: c.extra } : {}),
    })
    const cur = store.records[def.id]
    const at = now.toISOString()

    if (!cur || best > cur.value) {
      const sameHolders =
        cur &&
        cur.holders.length === winners.length &&
        winners.every((w) => cur.holders.some((h) => (h.game ? `g:${h.game}` : `m:${h.id}`) === keyOf(w)))
      const history = cur?.history ?? []
      if (cur && !sameHolders) {
        // novedad: alguien nuevo se quedó con el récord (la primera vez que se define no se avisa)
        addEvent(store, { k: 'record', rid: def.id, who: who(winners.map(toHolder)), from: who(cur.holders), v: toUnit(def.kind, best), pv: toUnit(def.kind, cur.value) }, now)
        history.push({ value: cur.value, holders: cur.holders.map((h) => h.name ?? h.game), at: cur.at })
        if (history.length > MAX_HISTORY) history.shift()
      }
      store.records[def.id] = {
        kind: def.kind,
        value: best,
        holders: winners.map(toHolder),
        at: sameHolders ? cur.at : at, // "desde" solo cambia si cambia el dueño
        history,
      }
      changed = true
    } else if (best === cur.value) {
      for (const w of winners) {
        if (!cur.holders.some((h) => (h.game ? `g:${h.game}` : `m:${h.id}`) === keyOf(w))) {
          cur.holders.push(toHolder(w))
          addEvent(store, { k: 'tie', rid: def.id, who: who([toHolder(w)]), v: toUnit(def.kind, best) }, now)
          changed = true
        }
      }
    }
    // mantiene los nombres al día
    const rec = store.records[def.id]
    for (const h of rec.holders) {
      const n = h.id && live.get(h.id)?.name
      if (n && n !== h.name) h.name = n
    }
  }
  return changed
}
