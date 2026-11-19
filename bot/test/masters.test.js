import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyStore } from '../src/store.js'
import { applyTick, buildPublic } from '../src/tracker.js'
import { updateMasters } from '../src/masters.js'

const opts = { timezone: 'America/Argentina/Buenos_Aires', voiceRequiresGame: false, streakMinSeconds: 600 }
const member = (id, name) => ({ id, name, avatar: null, status: 'online', game: 'Hunt', inVoice: true, channelId: 'c' })
const H = 3600
const t0 = new Date('2026-11-10T15:00:00Z')
const people = { 1: member('1', 'Nox'), 2: member('2', 'Kira'), 3: member('3', 'Zeta'), 4: member('4', 'Valkyr') }
const snap = Object.values(people)
const play = (store, id, hours, game = 'Hunt') => applyTick(store, [{ ...people[id], game }], hours * H, t0, opts) // solo esta persona suma
const podium = (store, game = 'Hunt') => store.masters[game]?.holders.map((h) => h.id)

test('el podio de cada juego son los 3 con más horas: oro, plata y bronce', () => {
  const store = emptyStore()
  play(store, '1', 110)
  play(store, '2', 52)
  play(store, '3', 1)
  play(store, '4', 0.5)
  updateMasters(store, snap, t0)
  assert.deepEqual(podium(store), ['1', '2', '3'])
  const pub = buildPublic(store, snap, opts, t0)
  assert.deepEqual(pub.masters.map((m) => [m.id, m.rank, m.tier]), [['1', 1, 'gold'], ['2', 2, 'silver'], ['3', 3, 'bronze']])
  assert.deepEqual(pub.members.find((m) => m.id === '4').masters, []) // 4.º: sin medalla
  assert.deepEqual(pub.members.find((m) => m.id === '2').masters, ['Hunt'])
})

test('hacen falta 10 horas del servidor, 2 jugadores y un mínimo de cada medallista', () => {
  const a = emptyStore()
  play(a, '1', 12)
  updateMasters(a, snap, t0)
  assert.deepEqual(a.masters, {}) // un solo jugador

  const b = emptyStore()
  play(b, '1', 12)
  play(b, '2', 0.05) // 3 minutos: no cuenta como jugador
  updateMasters(b, snap, t0)
  assert.deepEqual(b.masters, {})

  const c = emptyStore()
  play(c, '1', 12)
  play(c, '2', 0.5)
  updateMasters(c, snap, t0)
  assert.deepEqual(podium(c), ['1', '2']) // con 2 jugadores, 2 medallas

  const d = emptyStore()
  play(d, '1', 4)
  play(d, '2', 4)
  updateMasters(d, snap, t0)
  assert.deepEqual(d.masters, {}) // 8 h en total: no alcanza
})

test('los puestos cambian solo si superan; el empate no mueve a nadie; el Master anterior queda en el historial', () => {
  const store = emptyStore()
  play(store, '1', 20)
  play(store, '2', 20)
  play(store, '3', 5)
  updateMasters(store, snap, t0)
  const first = podium(store)
  assert.deepEqual(first.slice().sort(), ['1', '2', '3'])
  assert.equal(first[2], '3')

  updateMasters(store, snap, new Date(t0.getTime() + 1000))
  assert.deepEqual(podium(store), first) // empate: igual

  const second = first[1]
  play(store, second, 1)
  updateMasters(store, snap, new Date(t0.getTime() + 2000))
  assert.deepEqual(podium(store).slice(0, 2), [second, first[0]]) // el segundo pasó al primero
  assert.equal(store.masters.Hunt.history.length, 1)

  // Zeta supera al 2.º
  play(store, '3', 30)
  updateMasters(store, snap, new Date(t0.getTime() + 3000))
  assert.equal(podium(store)[0], '3')
  const pub = buildPublic(store, snap, opts, new Date(t0.getTime() + 4000))
  assert.equal(pub.masters.find((m) => m.rank === 1).previous.hours, 21)
})

test('si alguien del podio se va del servidor, el puesto pasa al siguiente', () => {
  const store = emptyStore()
  play(store, '1', 30)
  play(store, '2', 20)
  play(store, '3', 10)
  play(store, '4', 5)
  updateMasters(store, snap, t0)
  assert.deepEqual(podium(store), ['1', '2', '3'])
  const without1 = snap.filter((m) => m.id !== '1')
  updateMasters(store, without1, t0)
  assert.deepEqual(podium(store), ['2', '3', '4'])
  assert.ok(!buildPublic(store, without1, opts, t0).masters.some((m) => m.id === '1'))
})

test('lee los datos de la versión anterior (un solo Master por juego)', () => {
  const store = emptyStore()
  play(store, '1', 30)
  play(store, '2', 10)
  store.masters = { Hunt: { id: '1', name: 'Nox', at: t0.toISOString(), history: [] } }
  updateMasters(store, snap, t0)
  assert.deepEqual(podium(store), ['1', '2'])
  assert.equal(store.masters.Hunt.id, undefined)
})
