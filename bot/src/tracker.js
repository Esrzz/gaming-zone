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
  return {
    name: m.name,
    avatar: m.avatar,
    voice: 0,
    rancho: 0,
    games: {},
    ranchoGames: {},
    days: {},
    // sesiones en voz (rachas continuas de presencia) y tiempo compartido con cada persona
    sessions: [],
    sessionCount: 0,
    sessionSeconds: 0,
    longest: 0,
    together: {},
  }
}

const SESSION_GAP_MS = 5 * 60_000 // si pasan más de 5 min sin registrar, es otra sesión
const MAX_SESSIONS = 20
const MIN_SESSION_SECONDS = 60

const topOf = (map = {}) => Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

// Cierra la sesión en curso (si hay) y la guarda en el historial
function endSession(rec) {
  const cur = rec.cur
  if (!cur) return
  delete rec.cur
  const seconds = (cur.e - cur.s) / 1000
  if (seconds < MIN_SESSION_SECONDS) return
  rec.sessions ??= []
  rec.sessions.push({ s: cur.s, e: cur.e, g: topOf(cur.g) })
  if (rec.sessions.length > MAX_SESSIONS) rec.sessions.splice(0, rec.sessions.length - MAX_SESSIONS)
  rec.sessionCount = (rec.sessionCount ?? 0) + 1
  rec.sessionSeconds = (rec.sessionSeconds ?? 0) + seconds
  rec.longest = Math.max(rec.longest ?? 0, seconds)
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
  const nowMs = now.getTime()
  const byChannel = new Map() // canal de voz -> miembros que están ahí contando

  for (const m of snapshot) {
    const playing = Boolean(m.game)
    if (playing && m.gameAppId) (store.gameApps ??= {})[m.game] = m.gameAppId
    const voiceCounts = m.inVoice && (!opts.voiceRequiresGame || playing)
    const ranchoCounts = !m.inVoice && playing

    let rec = store.members[m.id]
    if (!voiceCounts && !ranchoCounts) {
      if (rec) {
        rec.name = m.name
        rec.avatar = m.avatar
        endSession(rec)
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

      if (rec.cur && nowMs - rec.cur.e > SESSION_GAP_MS) endSession(rec)
      rec.cur ??= { s: nowMs - dt * 1000, e: nowMs, g: {} }
      rec.cur.e = nowMs
      if (playing) add(rec.cur.g, m.game, dt)

      if (m.channelId) {
        const list = byChannel.get(m.channelId) ?? []
        list.push(m.id)
        byChannel.set(m.channelId, list)
      }
    } else {
      endSession(rec)
      rec.rancho += dt
      add(rec.ranchoGames, m.game, dt)
    }
  }

  // Tiempo compartido: quienes están en el mismo canal de voz a la vez
  for (const ids of byChannel.values()) {
    for (const a of ids) {
      const together = (store.members[a].together ??= {})
      for (const b of ids) if (a !== b) add(together, b, dt)
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

  for (const l of snapshot) {
    const id = l.id
    const rec = store.members[id] ?? newRecord(l)

    const recent = (rec.sessions ?? []).slice(-8).map((x) => ({
      start: new Date(x.s).toISOString(),
      minutes: Math.round((x.e - x.s) / 60_000),
      game: x.g,
    }))
    // sesión en curso, si sigue en voz
    if (rec.cur && l.inVoice) {
      recent.push({
        start: new Date(rec.cur.s).toISOString(),
        minutes: Math.round((now.getTime() - rec.cur.s) / 60_000),
        game: topOf(rec.cur.g),
        live: true,
      })
    }
    const together = Object.entries(rec.together ?? {})
      .filter(([other]) => live.has(other))
      .map(([other, s]) => ({ id: other, name: live.get(other).name, avatar: live.get(other).avatar, hours: toHours(s) }))
      .filter((t) => t.hours > 0)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)

    members.push({
      id,
      name: l.name,
      avatar: l.avatar,
      status: l.status,
      inVoice: l.inVoice,
      activity: l.game ? { verb: 'Jugando a', name: l.game } : null,
      hours: toHours(rec.voice),
      week: toHours(weekSeconds(rec, today)),
      today: toHours(rec.days?.[today] ?? 0),
      streak: streakDays(rec, today, opts.streakMinSeconds),
      games: gamesToHours(rec.games),
      rancho: toHours(rec.rancho),
      ranchoGames: gamesToHours(rec.ranchoGames),
      sessions: {
        count: rec.sessionCount ?? 0,
        longest: toHours(rec.longest ?? 0),
        average: rec.sessionCount ? toHours(rec.sessionSeconds / rec.sessionCount) : 0,
        recent: recent.reverse(),
      },
      together,
    })
  }

  members.sort((a, b) => b.hours - a.hours || b.rancho - a.rancho)

  // Íconos solo de los juegos que aparecen en los datos
  const gameIcons = {}
  const icons = store.gameIcons ?? {}
  for (const m of members) {
    for (const g of [...Object.keys(m.games), ...Object.keys(m.ranchoGames), m.activity?.name]) {
      if (g && icons[g]) gameIcons[g] = icons[g]
    }
  }

  return {
    updatedAt: now.toISOString(),
    meta: {
      memberCount: snapshot.length,
      onlineCount: snapshot.filter((m) => m.status !== 'offline').length,
      inVoiceCount: snapshot.filter((m) => m.inVoice).length,
    },
    gameIcons,
    members,
  }
}
