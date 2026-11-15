// Lógica de conteo. Son funciones puras (sin Discord ni disco) para poder probarlas.
//
// Reglas:
//  - En un canal de voz (y no el de AFK)  -> suma "horas en voz", y las del juego si está jugando.
//  - Jugando FUERA de un canal de voz     -> suma a "rancho aparte".
//  - Conectado sin jugar ni estar en voz  -> no suma nada.

export function dayKey(date, timeZone) {
  // 'en-CA' formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// Claves de los últimos n días (hoy primero), con aritmética de calendario
// para no tener problemas con cambios de horario.
export function recentDayKeys(todayKey, n) {
  const [y, m, d] = todayKey.split('-').map(Number)
  const keys = []
  for (let i = 0; i < n; i++) {
    keys.push(new Date(Date.UTC(y, m - 1, d - i, 12)).toISOString().slice(0, 10))
  }
  return keys
}

function newRecord(m) {
  return { name: m.name, avatar: m.avatar, voice: 0, rancho: 0, games: {}, ranchoGames: {}, days: {} }
}

function add(map, key, seconds) {
  map[key] = (map[key] ?? 0) + seconds
}

/**
 * Suma `dt` segundos a cada miembro según lo que está haciendo en este momento.
 * snapshot: [{ id, name, avatar, status, game, inVoice }]
 * opts: { timezone, voiceRequiresGame }
 */
export function applyTick(store, snapshot, dt, now, opts) {
  if (!(dt > 0)) return
  const today = dayKey(now, opts.timezone)

  for (const m of snapshot) {
    const playing = Boolean(m.game)
    const voiceCounts = m.inVoice && (!opts.voiceRequiresGame || playing)
    const ranchoCounts = !m.inVoice && playing

    let rec = store.members[m.id]
    if (!voiceCounts && !ranchoCounts) {
      if (rec) {
        rec.name = m.name
        rec.avatar = m.avatar
      }
      continue
    }

    rec ??= store.members[m.id] = newRecord(m)
    rec.name = m.name
    rec.avatar = m.avatar

    if (voiceCounts) {
      rec.voice += dt
      add(rec.days, today, dt)
      if (playing) add(rec.games, m.game, dt)
    } else {
      rec.rancho += dt
      add(rec.ranchoGames, m.game, dt)
    }
  }
}

export function pruneOldDays(store, todayKey, keepDays = 120) {
  const cutoff = recentDayKeys(todayKey, keepDays).at(-1)
  for (const rec of Object.values(store.members)) {
    for (const key of Object.keys(rec.days)) {
      if (key < cutoff) delete rec.days[key]
    }
  }
}

export function weekSeconds(rec, todayKey) {
  return recentDayKeys(todayKey, 7).reduce((sum, key) => sum + (rec.days[key] ?? 0), 0)
}

// Días seguidos con al menos `minSeconds` en voz.
// Si hoy todavía no llegó al mínimo, la racha sigue viva y cuenta desde ayer.
export function streakDays(rec, todayKey, minSeconds) {
  const keys = recentDayKeys(todayKey, 120)
  let i = (rec.days[keys[0]] ?? 0) >= minSeconds ? 0 : 1
  let count = 0
  for (; i < keys.length; i++) {
    if ((rec.days[keys[i]] ?? 0) >= minSeconds) count++
    else break
  }
  return count
}

const toHours = (seconds) => Math.round(seconds / 36) / 100 // 2 decimales

function gamesToHours(map) {
  return Object.fromEntries(
    Object.entries(map)
      .map(([game, s]) => [game, toHours(s)])
      .filter(([, h]) => h > 0)
      .sort((a, b) => b[1] - a[1]),
  )
}

// Arma el JSON que consume la página.
export function buildPublic(store, snapshot, opts, now = new Date()) {
  const today = dayKey(now, opts.timezone)
  const live = new Map(snapshot.map((m) => [m.id, m]))
  const members = []

  for (const [id, rec] of Object.entries(store.members)) {
    const l = live.get(id)
    if (!l) continue // se fue del servidor o está excluido

    members.push({
      id,
      name: l.name,
      avatar: l.avatar,
      status: l.status,
      inVoice: l.inVoice,
      activity: l.game ? { verb: 'Jugando a', name: l.game } : null,
      hours: toHours(rec.voice),
      week: toHours(weekSeconds(rec, today)),
      streak: streakDays(rec, today, opts.streakMinSeconds),
      games: gamesToHours(rec.games),
      rancho: toHours(rec.rancho),
      ranchoGames: gamesToHours(rec.ranchoGames),
    })
  }

  members.sort((a, b) => b.hours - a.hours || b.rancho - a.rancho)

  return {
    updatedAt: now.toISOString(),
    meta: {
      memberCount: snapshot.length,
      onlineCount: snapshot.filter((m) => m.status !== 'offline').length,
      inVoiceCount: snapshot.filter((m) => m.inVoice).length,
    },
    members,
  }
}
