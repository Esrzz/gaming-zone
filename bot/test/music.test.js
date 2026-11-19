import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSpotify } from '../src/music.js'

const NOW = 1_800_000_000_000
const act = (over = {}) => ({
  syncId: '4uLU6hMCjMI75M1A2tKUQC',
  details: 'Una canción',
  state: 'Artista A; Artista B',
  timestamps: { end: new Date(NOW + 60_000) },
  assets: { largeImageURL: () => 'https://i.scdn.co/image/abc' },
  ...over,
})

test('parseSpotify: título, artistas separados por ; y portada', () => {
  const m = parseSpotify(act(), NOW)
  assert.deepEqual(m, { title: 'Una canción', artists: ['Artista A', 'Artista B'], image: 'https://i.scdn.co/image/abc', id: '4uLU6hMCjMI75M1A2tKUQC' })
})

test('parseSpotify: ignora canciones que ya terminaron (pausa) y actividades vacías', () => {
  assert.equal(parseSpotify(act({ timestamps: { end: new Date(NOW - 60_000) } }), NOW), null)
  assert.equal(parseSpotify(act({ details: '' }), NOW), null)
  assert.equal(parseSpotify(null, NOW), null)
})

test('parseSpotify: sin artista o sin portada no rompe', () => {
  const m = parseSpotify(act({ state: null, assets: null }), NOW)
  assert.deepEqual(m.artists, ['Artista desconocido'])
  assert.equal(m.image, null)
})

test('parseSpotify: un syncId raro se descarta en vez de armar un link roto', () => {
  assert.equal(parseSpotify(act({ syncId: 'no es un id!' }), NOW).id, null)
  assert.equal(parseSpotify(act({ syncId: undefined }), NOW).id, null)
})
