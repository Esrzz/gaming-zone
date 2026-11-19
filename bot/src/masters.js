// Podio de cada juego: los 3 que más horas acumularon en él (dentro y fuera de voz).
//   1.º = Master con medalla de oro, 2.º = plata, 3.º = bronce.
// Para que un juego tenga podio hace falta que el servidor sume al menos MIN_TOTAL_HOURS y que
// lo hayan jugado al menos MIN_PLAYERS personas. Cada medallista tiene que haber jugado un mínimo
// (MIN_PLAYER_SECONDS), así que con 2 jugadores solo hay 2 medallas.
//
// Los puestos solo cambian cuando alguien SUPERA a otro (si empatan, no se mueve nadie).
// Se guardan en store.masters[juego] = { holders: [{ id, name, at }], history }, aparte de las sesiones.

const HOUR = 3600
export const MIN_TOTAL_HOURS = 10
export const MIN_PLAYERS = 2
export const MIN_PLAYER_SECONDS = 10 * 60
export const PODIUM = 3
export const TIER_BY_RANK = ['gold', 'silver', 'bronze']
const MAX_HISTORY = 3

export const tierOf = (rank) => TIER_BY_RANK[rank - 1]

// Horas de cada persona en cada juego (voz + fuera de voz), solo miembros que siguen en el servidor
export function gameTotals(store, liveIds) {
  const out = {}
  for (const [id, rec] of Object.entries(store.members)) {
    if (!liveIds.has(id)) continue
    for (const map of [rec.games, rec.ranchoGames]) {
      for (const [game, s] of Object.entries(map ?? {})) {
        ;((out[game] ??= {})[id] ??= 0)
        out[game][id] += s
      }
    }
  }
  return out
}

// Compatibilidad: la versión anterior guardaba un solo Master por juego
const holdersOf = (cur) => cur?.holders ?? (cur?.id ? [{ id: cur.id, name: cur.name, at: cur.at }] : [])

export function updateMasters(store, snapshot, now) {
  store.masters ??= {}
  const live = new Map(snapshot.map((m) => [m.id, m]))
  const totals = gameTotals(store, new Set(live.keys()))
  let changed = false

  for (const [game, per] of Object.entries(totals)) {
    const list = Object.entries(per).map(([id, s]) => ({ id, s: Math.round(s) }))
    const total = list.reduce((a, x) => a + x.s, 0)
    const players = list.filter((x) => x.s >= MIN_PLAYER_SECONDS).length
    if (total < MIN_TOTAL_HOURS * HOUR || players < MIN_PLAYERS) continue

    const cur = store.masters[game]
    const before = holdersOf(cur)
    const oldRank = new Map(before.map((h, i) => [h.id, i]))
    // más horas primero; si empatan, quien ya estaba mejor ubicado; después por id para que sea estable
    const next = list
      .filter((x) => x.s >= MIN_PLAYER_SECONDS)
      .sort((a, b) => b.s - a.s || (oldRank.get(a.id) ?? 99) - (oldRank.get(b.id) ?? 99) || (a.id < b.id ? -1 : 1))
      .slice(0, PODIUM)

    const holders = next.map((x, i) => {
      const prev = before[i]
      const name = live.get(x.id)?.name ?? store.members[x.id]?.name
      return prev?.id === x.id ? { ...prev, name } : { id: x.id, name, at: now.toISOString() }
    })
    const same = holders.length === before.length && holders.every((h, i) => h.id === before[i].id)
    if (same) {
      if (cur.holders) cur.holders = holders // al día con los nombres
      else store.masters[game] = { holders, history: cur.history ?? [] }
      continue
    }
    const history = cur?.history ?? []
    if (before[0] && before[0].id !== holders[0].id) {
      history.push({ name: before[0].name, seconds: per[before[0].id] ?? cur.seconds ?? 0, at: before[0].at })
      if (history.length > MAX_HISTORY) history.shift()
    }
    store.masters[game] = { holders, history }
    changed = true
  }
  return changed
}

// Lista para la página: una entrada por medalla (juego + persona), ordenada de oro a bronce.
export function publicMasters(store, live) {
  const totals = gameTotals(store, new Set(live.keys()))
  const toHours = (s) => Math.round((s / HOUR) * 100) / 100
  const out = []
  for (const [game, m] of Object.entries(store.masters ?? {})) {
    const per = totals[game]
    if (!per) continue
    const all = Object.values(per)
    const total = toHours(all.reduce((a, x) => a + x, 0))
    const players = all.filter((s) => s >= MIN_PLAYER_SECONDS).length
    const prev = m.history?.[m.history.length - 1]
    holdersOf(m).forEach((h, i) => {
      if (per[h.id] === undefined || !live.has(h.id)) return
      out.push({
        game,
        id: h.id,
        name: live.get(h.id).name,
        avatar: live.get(h.id).avatar ?? null,
        rank: i + 1,
        tier: tierOf(i + 1),
        hours: toHours(per[h.id]),
        total,
        players,
        since: h.at,
        previous: i === 0 && prev ? { name: prev.name, hours: toHours(prev.seconds) } : null,
      })
    })
  }
  return out.sort((a, b) => a.rank - b.rank || b.hours - a.hours)
}
