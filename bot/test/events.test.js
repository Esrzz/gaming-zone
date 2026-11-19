import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyStore } from '../src/store.js'
import { applyTick, buildPublic } from '../src/tracker.js'
import { updateRecords } from '../src/records.js'
import { updateMasters } from '../src/masters.js'
import { addEvent, pruneEvents, MAX_EVENTS, SEND_EVENTS } from '../src/events.js'

const opts = { timezone: 'America/Argentina/Buenos_Aires', voiceRequiresGame: false, streakMinSeconds: 600 }
const H = 3600
const t0 = new Date('2026-11-10T15:00:00Z')
const at = (s) => new Date(t0.getTime() + s * 1000)
const P = {
  1: { id: '1', name: 'Nox', avatar: null, status: 'online', game: 'Hunt', inVoice: true, channelId: 'c' },
  2: { id: '2', name: 'Kira', avatar: null, status: 'online', game: 'Hunt', inVoice: true, channelId: 'c' },
  3: { id: '3', name: 'Zeta', avatar: null, status: 'online', game: 'Hunt', inVoice: true, channelId: 'c' },
}
const snap = Object.values(P)
const play = (store, id, hours) => applyTick(store, [P[id]], hours * H, t0, opts)
const gamer = (store) => (store.events ?? []).filter((e) => e.rid === 'gamer') // jugar mueve varios récords a la vez
const kinds = (store) => (store.events ?? []).map((e) => e.k)

test('la primera vez que se define un récord no genera novedad', () => {
  const store = emptyStore()
  play(store, '1', 5)
  updateRecords(store, snap, t0, opts)
  assert.equal(store.records.gamer.holders[0].id, '1')
  assert.deepEqual(store.events ?? [], [])
})

test('superar un récord genera una novedad con quién, a quién y los valores; mejorar el propio no', () => {
  const store = emptyStore()
  play(store, '1', 5)
  updateRecords(store, snap, t0, opts)
  play(store, '1', 1) // Nox mejora su propio récord
  updateRecords(store, snap, at(10), opts)
  assert.deepEqual(gamer(store), [])

  play(store, '2', 8) // Kira lo supera
  updateRecords(store, snap, at(20), opts)
  assert.equal(gamer(store).length, 1)
  const e = gamer(store)[0]
  assert.equal(e.k, 'record')
  assert.equal(e.rid, 'gamer')
  assert.deepEqual(e.who, [{ id: '2', n: 'Kira' }])
  assert.deepEqual(e.from, [{ id: '1', n: 'Nox' }])
  assert.equal(e.v, 8)
  assert.equal(e.pv, 6)
  assert.equal(e.t, at(20).getTime())
})

test('igualar un récord genera una novedad de empate', () => {
  const store = emptyStore()
  play(store, '1', 5)
  updateRecords(store, snap, t0, opts)
  play(store, '2', 5)
  updateRecords(store, snap, at(5), opts)
  assert.deepEqual(gamer(store).map((e) => e.k), ['tie'])
  assert.deepEqual(gamer(store)[0].who, [{ id: '2', n: 'Kira' }])
})

test('Master y podio: nuevo Master y quién entra al podio; sin avisos al armarse el podio ni al irse alguien', () => {
  const store = emptyStore()
  play(store, '1', 30)
  play(store, '2', 20)
  updateMasters(store, snap, t0)
  assert.deepEqual(store.events ?? [], []) // se armó el podio

  play(store, '3', 5) // entra al podio (3.º)
  updateMasters(store, snap, at(10))
  assert.deepEqual(kinds(store), ['podium'])
  assert.equal(store.events[0].rank, 3)
  assert.equal(store.events[0].game, 'Hunt')

  play(store, '2', 15) // Kira (35 h) pasa a Nox (30 h): nuevo Master
  updateMasters(store, snap, at(20))
  assert.deepEqual(kinds(store), ['podium', 'master'])
  const m = store.events[1]
  assert.deepEqual(m.who, [{ id: '2', n: 'Kira' }])
  assert.deepEqual(m.from, [{ id: '1', n: 'Nox' }])

  // alguien se va del servidor: el podio se reacomoda en silencio
  updateMasters(store, [P[2], P[3]], at(30))
  assert.deepEqual(kinds(store), ['podium', 'master'])
})

test('se guardan como mucho 500 y se descartan los de más de 30 días; la página recibe los últimos 100, el más nuevo primero', () => {
  const store = emptyStore()
  addEvent(store, { k: 'record', rid: 'viejo' }, new Date(t0.getTime() - 40 * 86_400_000))
  for (let i = 0; i < MAX_EVENTS + 20; i++) addEvent(store, { k: 'podium', game: 'G', rank: 2, n: i }, at(i))
  assert.equal(store.events.length, MAX_EVENTS)
  assert.ok(!store.events.some((e) => e.rid === 'viejo'))
  pruneEvents(store, new Date(t0.getTime() + 31 * 86_400_000))
  assert.equal(store.events.length, 0)

  for (let i = 0; i < 150; i++) addEvent(store, { k: 'podium', game: 'G', rank: 2, n: i }, at(100 + i))
  const pub = buildPublic(store, snap, opts, at(300))
  assert.equal(pub.events.length, SEND_EVENTS)
  assert.equal(pub.events[0].n, 149)
  assert.ok(pub.events[0].t > pub.events[1].t)
})
