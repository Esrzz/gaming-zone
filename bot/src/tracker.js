// Lógica de conteo. Son funciones puras (sin Discord ni disco) para poder probarlas.
//
// Reglas:
//  - En un canal de voz (y no el de AFK)  -> suma "horas en voz", y las del juego si está jugando.
//  - Jugando FUERA de un canal de voz     -> suma a "rancho aparte".
//  - Conectado sin jugar ni estar en voz  -> no suma nada.

import { publicMasters } from './masters.js'

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
    idleBest: 0, // más segundos seguidos en voz sin jugar
    shapeBest: 0, // más juegos distintos en una sola sesión
    // Spotify: segundos totales, por artista y por canción
    music: 0,
    artists: {},
    songs: {},
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

function addMusic(rec, music, dt) {
  rec.music = (rec.music ?? 0) + dt
  rec.artists ??= {}
  rec.songs ??= {}
  for (const a of music.artists) add(rec.artists, a, dt)
  const key = `${music.artists.join(', ')} — ${music.title}`
  const e = (rec.songs[key] ??= { t: music.title, ar: music.artists, img: null, id: null, s: 0 })
  e.s += dt
  if (music.image) e.img = music.image
  if (music.id) e.id = music.id
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

    // La música cuenta aparte: no depende de estar en voz ni jugando
    if (m.music) {
      rec ??= store.members[m.id] = newRecord(m)
      rec.name = m.name
      rec.avatar = m.avatar
      addMusic(rec, m.music, dt)
    }

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

      // Para los récords "El fantasma" y "El shapeshifter"
      rec.cur.ir = playing ? 0 : (rec.cur.ir ?? 0) + dt
      rec.idleBest = Math.max(rec.idleBest ?? 0, rec.cur.ir)
      const distinct = Object.values(rec.cur.g).filter((sec) => sec >= 300).length
      rec.shapeBest = Math.max(rec.shapeBest ?? 0, distinct)

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

const top = (obj, n) =>
  Object.entries(obj ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)

// Lo más escuchado de una persona (para su ficha)
function memberMusic(rec) {
  const songs = Object.values(rec.songs ?? {})
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((x) => ({ title: x.t, artist: x.ar.join(', '), image: x.img, id: x.id ?? null, hours: toHours(x.s) }))
  const artistImg = {}
  for (const x of Object.values(rec.songs ?? {}).sort((a, b) => b.s - a.s)) {
    for (const a of x.ar) if (x.img && !artistImg[a]) artistImg[a] = x.img
  }
  return {
    hours: toHours(rec.music ?? 0),
    artists: top(rec.artists, 5).map(([name, s]) => ({ name, image: artistImg[name] ?? null, hours: toHours(s) })),
    songs,
  }
}

// Tops de música de todo el servidor, con quién escucha más cada artista y cada canción
function buildMusicTop(store, live) {
  const artists = new Map()
  const songs = new Map()
  let total = 0
  const people = new Set()

  const bump = (map, key, base, who, s) => {
    const e = map.get(key) ?? { ...base, seconds: 0, who: new Map() }
    e.seconds += s
    if (!e.id && base.id) e.id = base.id
    e.who.set(who.id, { id: who.id, name: who.name, s: (e.who.get(who.id)?.s ?? 0) + s })
    map.set(key, e)
    return e
  }

  for (const [id, rec] of Object.entries(store.members)) {
    const l = live.get(id)
    if (!l || !(rec.music > 0)) continue
    total += rec.music
    people.add(id)
    const who = { id, name: l.name }
    for (const [name, s] of Object.entries(rec.artists ?? {})) bump(artists, name, { name, image: null, best: 0 }, who, s)
    for (const [key, x] of Object.entries(rec.songs ?? {})) {
      bump(songs, key, { title: x.t, artist: x.ar.join(', '), image: x.img, id: x.id ?? null }, who, x.s)
      for (const a of x.ar) {
        const art = artists.get(a)
        if (art && x.img && x.s > art.best) {
          art.best = x.s
          art.image = x.img // portada de la canción más escuchada de ese artista
        }
      }
    }
  }

  const finish = (e) => {
    const listeners = [...e.who.values()].sort((a, b) => b.s - a.s)
    return {
      ...e,
      who: undefined,
      best: undefined,
      seconds: undefined,
      hours: toHours(e.seconds),
      listeners: listeners.length,
      top: listeners.slice(0, 3).map((x) => ({ id: x.id, name: x.name, hours: toHours(x.s) })),
    }
  }
  const rank = (map, n) =>
    [...map.values()]
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, n)
      .map(finish)
      .filter((x) => x.hours > 0)

  return { hours: toHours(total), people: people.size, artists: rank(artists, 20), songs: rank(songs, 20) }
}

// Arma el JSON que consume la página.
export function buildPublic(store, snapshot, opts, now = new Date()) {
  const today = dayKey(now, opts.timezone)
  const live = new Map(snapshot.map((m) => [m.id, m]))
  const members = []

  // Récords guardados + medallas por persona
  const records = Object.entries(store.records ?? {}).map(([id, r]) => ({
    id,
    kind: r.kind,
    value: r.kind === 'hours' ? toHours(r.value) : r.value,
    holders: r.holders.map((h) => ({ ...h, avatar: h.id ? live.get(h.id)?.avatar ?? null : undefined })),
    since: r.at,
    // el dueño anterior: sus horas también se guardan en segundos, se pasan igual que el valor actual
    previous: r.history?.length
      ? { ...r.history[r.history.length - 1], value: r.kind === 'hours' ? toHours(r.history[r.history.length - 1].value) : r.history[r.history.length - 1].value }
      : null,
  }))
  const medals = {}
  for (const r of records) for (const h of r.holders) if (h.id) (medals[h.id] ??= []).push(r.id)

  // Masters de cada juego (uno por juego) y los que tiene cada persona
  const masters = publicMasters(store, live)
  const masterGames = {}
  for (const m of masters) (masterGames[m.id] ??= []).push(m.game)

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
      listening: l.music
        ? { title: l.music.title, artist: l.music.artists.join(', '), image: l.music.image }
        : null,
      music: memberMusic(rec),
      medals: medals[id] ?? [],
      masters: masterGames[id] ?? [],
    })
  }

  members.sort((a, b) => b.hours - a.hours || b.rancho - a.rancho)

  const musicTop = buildMusicTop(store, live)


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
    musicTop,
    records,
    masters,
    members,
  }
}
