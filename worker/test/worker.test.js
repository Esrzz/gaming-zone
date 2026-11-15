import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.js'

function makeEnv(over = {}) {
  const kv = new Map()
  return {
    PUSH_TOKEN: 'secreto-largo',
    ALLOWED_ORIGIN: '*',
    STATS: {
      get: async (key) => kv.get(key) ?? null,
      put: async (key, value) => void kv.set(key, value),
    },
    ...over,
  }
}

const call = (env, path, init) => worker.fetch(new Request(`https://api.test${path}`, init), env)
const push = (env, body, token = 'secreto-largo') =>
  call(env, '/api/push', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

const payload = { updatedAt: '2026-11-14T22:00:00.000Z', meta: {}, members: [{ id: '1', name: 'Nox' }] }

test('antes de que llegue algo, /api/members responde 503', async () => {
  const res = await call(makeEnv(), '/api/members')
  assert.equal(res.status, 503)
})

test('push sin token o con token incorrecto: 401', async () => {
  const env = makeEnv()
  assert.equal((await push(env, payload, null)).status, 401)
  assert.equal((await push(env, payload, 'otro')).status, 401)
  assert.equal((await call(env, '/api/members')).status, 503) // no se guardó nada
})

test('si el Worker no tiene PUSH_TOKEN configurado, nadie puede escribir', async () => {
  const env = makeEnv({ PUSH_TOKEN: undefined })
  assert.equal((await push(env, payload, '')).status, 401)
})

test('push con datos mal formados: 400', async () => {
  const env = makeEnv()
  assert.equal((await push(env, 'esto no es json')).status, 400)
  assert.equal((await push(env, { sin: 'members' })).status, 400)
})

test('push válido se guarda y /api/members lo devuelve con CORS', async () => {
  const env = makeEnv()
  assert.equal((await push(env, payload)).status, 204)

  const res = await call(env, '/api/members')
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*')
  assert.deepEqual(await res.json(), payload)
})

test('ALLOWED_ORIGIN se respeta', async () => {
  const env = makeEnv({ ALLOWED_ORIGIN: 'https://gamingzone.pages.dev' })
  await push(env, payload)
  const res = await call(env, '/api/members')
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://gamingzone.pages.dev')
})

test('OPTIONS responde 204 (preflight del navegador)', async () => {
  const res = await call(makeEnv(), '/api/push', { method: 'OPTIONS' })
  assert.equal(res.status, 204)
  assert.match(res.headers.get('Access-Control-Allow-Headers'), /Authorization/)
})

test('métodos y rutas incorrectos', async () => {
  const env = makeEnv()
  assert.equal((await call(env, '/api/push')).status, 405)
  assert.equal((await call(env, '/api/members', { method: 'POST' })).status, 405)
  assert.equal((await call(env, '/otra-cosa')).status, 404)
  assert.equal((await call(env, '/health')).status, 200)
})

test('rechaza datos demasiado grandes', async () => {
  const env = makeEnv()
  const grande = JSON.stringify({ members: [], relleno: 'x'.repeat(300 * 1024) })
  assert.equal((await push(env, grande)).status, 413)
})
