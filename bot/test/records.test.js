import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyStore } from '../src/store.js'
import { applyTick, buildPublic } from '../src/tracker.js'
import { updateRecords } from '../src/records.js'

const opts = { timezone: 'America/Argentina/Buenos_Aires', voiceRequiresGame: false, streakMinSeconds: 600 }
const member = (id, name, over = {}) => ({ id, name, avatar: null, status: 'online', game: null, inVoice: false, ...over })
const H = 3600
const t0 = new Date('2026-11-10T15:00:00Z')

test('el récord pasa a quien lo supera, empatan comparten, y el anterior queda en el historial', () => {
  const store = emptyStore()
  const snap = [member('1', 'Nox', { inVoice: true, channelId: 'c' }), member('2', 'Kira', { inVoice: true, channelId: 'c' })]
  applyTick(store, snap, 2 * H, t0, opts)
  updateRecords(store, snap, t0, opts)
  // empate en horas: comparten
  assert.deepEqual(store.records.gamer.holders.map((h) => h.id).sort(), ['1', '2'])

  // Nox suma más: se queda solo
  applyTick(store, [snap[0]], H, t0, opts)
  updateRecords(store, snap, new Date(t0.getTime() + 1000), opts)
  assert.deepEqual(store.records.gamer.holders.map((h) => h.id), ['1'])
  assert.equal(store.records.gamer.value, 3 * H)
  assert.equal(store.records.gamer.history.length, 1)

  // en el payload el dueño anterior viene en horas, igual que el valor actual (no en segundos)
  const pub = buildPublic(store, snap, opts, new Date(t0.getTime() + 1500))
  assert.equal(pub.records.find((r) => r.id === 'gamer').previous.value, 2)

  // si Nox se va del servidor el récord se conserva
  updateRecords(store, [snap[1]], new Date(t0.getTime() + 2000), opts)
  assert.deepEqual(store.records.gamer.holders.map((h) => h.id), ['1'])
})

test('no se premian valores por debajo del mínimo', () => {
  const store = emptyStore()
  const snap = [member('1', 'Nox', { inVoice: true })]
  applyTick(store, snap, 60, t0, opts)
  updateRecords(store, snap, t0, opts)
  assert.deepEqual(store.records, {})
})

test('fantasma, shapeshifter, OTP, janeo y vibra', () => {
  const store = emptyStore()
  // Kira: 1 h en voz sin jugar
  const kira = [member('2', 'Kira', { inVoice: true })]
  for (let i = 0; i < 12; i++) applyTick(store, kira, 300, new Date(t0.getTime() + i * 300_000), opts)
  // Nox: 3 juegos distintos en una misma sesión (6 min cada uno, ticks de 3 min), y música
  const song = { title: 'x', artists: ['A'], image: null, id: null }
  let k = 0
  for (const g of ['Valorant', 'Hunt', 'CS2']) {
    for (let i = 0; i < 2; i++) applyTick(store, [member('1', 'Nox', { inVoice: true, game: g, music: song })], 180, new Date(t0.getTime() + 180_000 * k++), opts)
  }
  // 1 h más de Valorant y música
  for (let i = 0; i < 20; i++) applyTick(store, [member('1', 'Nox', { inVoice: true, game: 'Valorant', music: song })], 180, new Date(t0.getTime() + 180_000 * k++), opts)
  const snap = [member('1', 'Nox'), member('2', 'Kira')]
  updateRecords(store, snap, new Date(t0.getTime() + 180_000 * k), opts)
  const r = store.records
  assert.equal(r.fantasma.holders[0].id, '2')
  assert.equal(r.shape.holders[0].id, '1')
  assert.equal(r.shape.value, 3)
  assert.equal(r.otp.holders[0].extra.game, 'Valorant')
  assert.equal(r.janeo.holders[0].game, 'Valorant')
  assert.equal(r.vibra.holders[0].id, '1')
  assert.equal(r.coleccionista.value, 3)
})

test('el payload trae los récords y las medallas por persona', () => {
  const store = emptyStore()
  const snap = [member('1', 'Nox', { inVoice: true }), member('2', 'Kira')]
  applyTick(store, snap, 2 * H, t0, opts)
  updateRecords(store, snap, t0, opts)
  const out = buildPublic(store, snap, opts, t0)
  const gamer = out.records.find((r) => r.id === 'gamer')
  assert.equal(gamer.value, 2)
  assert.equal(gamer.holders[0].name, 'Nox')
  assert.ok(out.members.find((m) => m.id === '1').medals.includes('gamer'))
  assert.deepEqual(out.members.find((m) => m.id === '2').medals, [])
})
