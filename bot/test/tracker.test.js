import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyStore } from '../src/store.js'
import { applyTick, buildPublic, recentDayKeys, streakDays, weekSeconds } from '../src/tracker.js'

const opts = {
  timezone: 'America/Argentina/Buenos_Aires',
  voiceRequiresGame: false,
  streakMinSeconds: 600,
}
const now = new Date('2026-11-14T15:00:00Z') // 12:00 en Buenos Aires
const TODAY = '2026-11-14'

const member = (over = {}) => ({
  id: '1',
  name: 'Nox',
  avatar: 'https://cdn.example/nox.webp',
  status: 'online',
  game: null,
  inVoice: false,
  ...over,
})

test('en voz y jugando: suma horas de voz y del juego', () => {
  const store = emptyStore()
  applyTick(store, [member({ inVoice: true, game: 'Hunt: Showdown 1896' })], 3600, now, opts)
  const rec = store.members['1']
  assert.equal(rec.voice, 3600)
  assert.equal(rec.games['Hunt: Showdown 1896'], 3600)
  assert.equal(rec.rancho, 0)
  assert.equal(rec.days[TODAY], 3600)
})

test('jugando fuera de voz: va a rancho aparte y no suma horas en voz', () => {
  const store = emptyStore()
  applyTick(store, [member({ game: 'Valorant' })], 1800, now, opts)
  const rec = store.members['1']
  assert.equal(rec.voice, 0)
  assert.equal(rec.rancho, 1800)
  assert.equal(rec.ranchoGames.Valorant, 1800)
  assert.deepEqual(rec.games, {})
  assert.deepEqual(rec.days, {})
})

test('en voz sin jugar: suma voz, sin juego', () => {
  const store = emptyStore()
  applyTick(store, [member({ inVoice: true })], 600, now, opts)
  assert.equal(store.members['1'].voice, 600)
  assert.deepEqual(store.members['1'].games, {})
})

test('con voiceRequiresGame, estar en voz sin jugar no suma', () => {
  const store = emptyStore()
  applyTick(store, [member({ inVoice: true })], 600, now, { ...opts, voiceRequiresGame: true })
  assert.deepEqual(store.members, {})
})

test('conectado sin jugar ni estar en voz no se registra', () => {
  const store = emptyStore()
  applyTick(store, [member()], 600, now, opts)
  assert.deepEqual(store.members, {})
})

test('un intervalo de 0 segundos o negativo no hace nada', () => {
  const store = emptyStore()
  applyTick(store, [member({ inVoice: true })], 0, now, opts)
  applyTick(store, [member({ inVoice: true })], -5, now, opts)
  assert.deepEqual(store.members, {})
})

test('recentDayKeys cruza bien el fin de mes', () => {
  assert.deepEqual(recentDayKeys('2026-03-02', 4), ['2026-03-02', '2026-03-01', '2026-02-28', '2026-02-27'])
})

test('semana y racha', () => {
  const keys = recentDayKeys(TODAY, 10)
  const rec = { days: { [keys[0]]: 700, [keys[1]]: 900, [keys[2]]: 650, [keys[4]]: 5000 } }
  assert.equal(weekSeconds(rec, TODAY), 700 + 900 + 650 + 5000)
  assert.equal(streakDays(rec, TODAY, 600), 3) // el día keys[3] vacío corta la racha

  // si hoy todavía no llegó al mínimo, la racha sigue desde ayer
  const early = { days: { [keys[0]]: 60, [keys[1]]: 900, [keys[2]]: 650 } }
  assert.equal(streakDays(early, TODAY, 600), 2)

  assert.equal(streakDays({ days: {} }, TODAY, 600), 0)
})

test('buildPublic: ordena por horas, redondea y incluye a todos los del servidor y descarta a quien ya no está', () => {
  const store = emptyStore()
  store.members = {
    1: { name: 'Nox', avatar: 'a', voice: 5400, rancho: 0, games: { X: 5400 }, ranchoGames: {}, days: {} },
    2: { name: 'Kira', avatar: 'b', voice: 9000, rancho: 3600, games: {}, ranchoGames: { Y: 3600 }, days: {} },
    3: { name: 'Se fue', avatar: 'c', voice: 99999, rancho: 0, games: {}, ranchoGames: {}, days: {} },
  }
  const snapshot = [
    member({ id: '1', name: 'Nox', inVoice: true, game: 'X' }),
    member({ id: '2', name: 'Kira', status: 'idle' }),
    member({ id: '9', name: 'Sin datos', status: 'offline' }),
  ]
  const out = buildPublic(store, snapshot, opts, now)

  assert.deepEqual(out.members.map((m) => m.name), ['Kira', 'Nox', 'Sin datos'])
  assert.equal(out.members[1].hours, 1.5)
  assert.equal(out.members[0].rancho, 1)
  assert.deepEqual(out.members[0].ranchoGames, { Y: 1 })
  assert.deepEqual(out.members[1].activity, { verb: 'Jugando a', name: 'X' })
  assert.equal(out.members[0].activity, null)
  assert.equal(out.members[2].hours, 0)
  assert.deepEqual(out.meta, { memberCount: 3, onlineCount: 2, inVoiceCount: 1 })
})

test('guarda el applicationId de los juegos y publica solo los íconos que se usan', () => {
  const store = emptyStore()
  applyTick(store, [member({ inVoice: true, game: 'Valorant', gameAppId: '123' })], 60, now, opts)
  assert.equal(store.gameApps['Valorant'], '123')
  store.gameIcons = { Valorant: 'https://cdn/v.png', Otro: 'https://cdn/o.png' }
  const out = buildPublic(store, [member({ inVoice: true, game: 'Valorant' })], opts, now)
  assert.deepEqual(out.gameIcons, { Valorant: 'https://cdn/v.png' })
})

test('sesiones: una racha continua en voz es una sesión; se parte con un corte largo', () => {
  const store = emptyStore()
  const inV = [member({ inVoice: true, game: 'Valorant' })]
  const t = (min) => new Date(now.getTime() + min * 60_000)
  for (let i = 0; i < 10; i++) applyTick(store, inV, 180, t(i * 3), opts) // 30 min seguidos
  applyTick(store, [member()], 30, t(40), opts) // sale de voz: cierra la sesión
  const rec = store.members['1']
  assert.equal(rec.sessionCount, 1)
  assert.equal(rec.sessions[0].g, 'Valorant')
  assert.equal(Math.round(rec.longest / 60), 30)

  // vuelve, y después un corte de 20 min sin ticks => otra sesión
  applyTick(store, inV, 600, t(100), opts)
  applyTick(store, inV, 600, t(130), opts)
  applyTick(store, [member()], 30, t(131), opts)
  assert.equal(rec.sessionCount, 2 + 1)
})

test('tiempo compartido: solo suma entre quienes están en el mismo canal', () => {
  const store = emptyStore()
  const snap = [
    member({ id: '1', name: 'A', inVoice: true, channelId: 'c1' }),
    member({ id: '2', name: 'B', inVoice: true, channelId: 'c1' }),
    member({ id: '3', name: 'C', inVoice: true, channelId: 'c2' }),
  ]
  applyTick(store, snap, 3600, now, opts)
  assert.equal(store.members['1'].together['2'], 3600)
  assert.equal(store.members['3'].together['1'], undefined)
  const out = buildPublic(store, snap, opts, now)
  const a = out.members.find((m) => m.id === '1')
  assert.deepEqual(a.together.map((x) => [x.id, x.hours]), [['2', 1]])
  assert.equal(a.sessions.recent[0].live, true)
  assert.equal(a.today, 1)
})
