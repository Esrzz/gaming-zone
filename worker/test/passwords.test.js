import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.js'
import { signToken } from '../src/auth.js'

function makeEnv() {
  const kv = new Map()
  return {
    ALLOWED_ORIGIN: '*',
    SESSION_SECRET: 'secreto-de-sesion-largo',
    STATS: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => void kv.set(k, v) },
    kv,
  }
}
const members = { members: [{ id: '42', name: 'Nox' }, { id: '7', name: 'Kira' }] }
const call = (env, path, init) => worker.fetch(new Request(`https://api.test${path}`, init), env)
const post = (env, path, body, token) =>
  call(env, path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
const sessionFor = (env, id, n) => signToken({ sub: id, n, exp: Date.now() + 1e9 }, env.SESSION_SECRET)
const setup = () => {
  const env = makeEnv()
  env.kv.set('members', JSON.stringify(members))
  return env
}

test('sin contraseña: el nombre entra libre (status no protegido)', async () => {
  const env = setup()
  assert.deepEqual(await (await call(env, '/nz/pw/status?name=nox')).json(), { member: true, protected: false })
  assert.deepEqual(await (await call(env, '/nz/pw/status?name=Alguien')).json(), { member: false, protected: false })
})

test('crear contraseña con sesión; después el nombre queda protegido y no se guarda en claro', async () => {
  const env = setup()
  const tok = await sessionFor(env, '42', 'Nox')
  assert.deepEqual(await (await call(env, '/nz/pw/me', { headers: { Authorization: `Bearer ${tok}` } })).json(), { set: false })
  assert.equal((await post(env, '/nz/pw/set', { password: 'corta' }, tok)).status, 400)
  assert.equal((await post(env, '/nz/pw/set', { password: 'clave-larga-1' })).status, 401)
  assert.equal((await post(env, '/nz/pw/set', { password: 'clave-larga-1' }, tok)).status, 204)
  assert.ok(!env.kv.get('pw:42').includes('clave-larga-1'))
  assert.deepEqual(await (await call(env, '/nz/pw/me', { headers: { Authorization: `Bearer ${tok}` } })).json(), { set: true })
  assert.deepEqual(await (await call(env, '/nz/pw/status?name=NOX')).json(), { member: true, protected: true })
})

test('entrar con nombre + contraseña devuelve una sesión; mal contraseña no', async () => {
  const env = setup()
  await post(env, '/nz/pw/set', { password: 'clave-larga-1' }, await sessionFor(env, '42', 'Nox'))
  const bad = await post(env, '/nz/pw/login', { name: 'nox', password: 'otra-clave' })
  assert.equal(bad.status, 403)
  assert.equal((await bad.json()).left, 4)
  const ok = await post(env, '/nz/pw/login', { name: 'nox', password: 'clave-larga-1' })
  assert.equal(ok.status, 200)
  const body = await ok.json()
  assert.equal(body.id, '42')
  const me = await call(env, '/auth/me', { headers: { Authorization: `Bearer ${body.token}` } })
  assert.equal(me.status, 200)
  // perfiles sin contraseña o inexistentes: misma respuesta
  assert.equal((await post(env, '/nz/pw/login', { name: 'Kira', password: 'clave-larga-1' })).status, 403)
  assert.equal((await post(env, '/nz/pw/login', { name: 'Nadie', password: 'clave-larga-1' })).status, 403)
})

test('5 intentos fallidos bloquean, incluso con la clave correcta', async () => {
  const env = setup()
  await post(env, '/nz/pw/set', { password: 'clave-larga-1' }, await sessionFor(env, '42', 'Nox'))
  for (let i = 0; i < 5; i++) assert.equal((await post(env, '/nz/pw/login', { name: 'Nox', password: `mal-${i}-xx` })).status, 403)
  assert.equal((await post(env, '/nz/pw/login', { name: 'Nox', password: 'clave-larga-1' })).status, 429)
})

test('cambiar la contraseña exige la actual', async () => {
  const env = setup()
  const tok = await sessionFor(env, '42', 'Nox')
  await post(env, '/nz/pw/set', { password: 'clave-larga-1' }, tok)
  assert.equal((await post(env, '/nz/pw/set', { password: 'nueva-clave-2' }, tok)).status, 403)
  assert.equal((await post(env, '/nz/pw/set', { password: 'nueva-clave-2', current: 'clave-larga-1' }, tok)).status, 204)
  assert.equal((await post(env, '/nz/pw/login', { name: 'Nox', password: 'nueva-clave-2' })).status, 200)
  assert.equal((await post(env, '/nz/pw/login', { name: 'Nox', password: 'clave-larga-1' })).status, 403)
})
