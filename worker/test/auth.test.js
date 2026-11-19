import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.js'
import { signToken, verifyToken, publicConnections } from '../src/auth.js'

function makeEnv(over = {}) {
  const kv = new Map()
  return {
    PUSH_TOKEN: 'push',
    ALLOWED_ORIGIN: '*',
    DISCORD_CLIENT_ID: '123',
    DISCORD_CLIENT_SECRET: 'cs',
    SESSION_SECRET: 'secreto-de-sesion-largo',
    SITE_URL: 'https://gz.pages.dev/',
    STATS: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => void kv.set(k, v) },
    kv,
    ...over,
  }
}
const call = (env, path, init) => worker.fetch(new Request(`https://api.test${path}`, init), env)
const members = { updatedAt: '2026-11-19T00:00:00.000Z', members: [{ id: '42', name: 'Nox' }, { id: '7', name: 'Kira' }] }

// Discord simulado
function fakeDiscord({ user = { id: '42', username: 'nox', global_name: 'Nox' }, conns = [], tokenOk = true } = {}) {
  const real = globalThis.fetch
  globalThis.fetch = async (url) => {
    const u = String(url)
    if (u.endsWith('/oauth2/token')) return tokenOk ? new Response(JSON.stringify({ access_token: 'at' })) : new Response('{}', { status: 400 })
    if (u.endsWith('/users/@me/connections')) return new Response(JSON.stringify(conns))
    if (u.endsWith('/users/@me')) return new Response(JSON.stringify(user))
    throw new Error(`fetch inesperado: ${u}`)
  }
  return () => (globalThis.fetch = real)
}

// Empieza el login y devuelve el estado y la cookie, como lo haría el navegador
async function start(env) {
  const res = await call(env, '/auth/login')
  const loc = new URL(res.headers.get('Location'))
  const cookie = res.headers.get('Set-Cookie').split(';')[0]
  return { res, loc, state: loc.searchParams.get('state'), cookie }
}
const finish = (env, state, cookie, extra = '') => call(env, `/auth/callback?code=abc&state=${state}${extra}`, { headers: { Cookie: cookie } })
const fragment = (res) => new URL(res.headers.get('Location')).hash

test('sin configurar, el login responde 503 claro', async () => {
  const res = await call(makeEnv({ DISCORD_CLIENT_SECRET: undefined }), '/auth/login')
  assert.equal(res.status, 503)
})

test('el login manda a Discord con los permisos justos y una cookie de estado', async () => {
  const { res, loc, cookie } = await start(makeEnv())
  assert.equal(res.status, 302)
  assert.equal(loc.origin + loc.pathname, 'https://discord.com/oauth2/authorize')
  assert.equal(loc.searchParams.get('client_id'), '123')
  assert.equal(loc.searchParams.get('scope'), 'identify connections')
  assert.equal(loc.searchParams.get('redirect_uri'), 'https://api.test/auth/callback')
  assert.match(res.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/)
  assert.ok(cookie.startsWith('gz_oauth='))
})

test('un miembro entra: vuelve a la página con la sesión y se guardan solo sus conexiones visibles', async () => {
  const env = makeEnv()
  env.kv.set('members', JSON.stringify(members))
  const restore = fakeDiscord({
    conns: [
      { type: 'steam', id: '765', name: 'noxx', visibility: 1, verified: true },
      { type: 'spotify', id: 's1', name: 'nox', visibility: 0, verified: true }, // oculta en su perfil: no se muestra
      { type: 'twitch', id: 't1', name: 'noxtv', visibility: 1, verified: false }, // sin verificar
    ],
  })
  try {
    const { state, cookie } = await start(env)
    const res = await finish(env, state, cookie)
    assert.equal(res.status, 302)
    assert.equal(new URL(res.headers.get('Location')).origin, 'https://gz.pages.dev')
    const token = decodeURIComponent(fragment(res).replace('#gz_login=', ''))
    const session = await verifyToken(token, env.SESSION_SECRET)
    assert.equal(session.sub, '42')
    assert.equal(session.n, 'Nox')

    const pub = await (await call(env, '/api/connections')).json()
    assert.deepEqual(pub, { 42: [{ t: 'steam', n: 'noxx', i: '765' }] })

    const me = await call(env, '/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    assert.deepEqual(await me.json(), { id: '42', name: 'Nox' })
  } finally {
    restore()
  }
})

test('alguien que no está en el servidor no entra y no se guarda nada', async () => {
  const env = makeEnv()
  env.kv.set('members', JSON.stringify(members))
  const restore = fakeDiscord({ user: { id: '999', username: 'extraño' }, conns: [{ type: 'steam', id: '1', name: 'x', visibility: 1 }] })
  try {
    const { state, cookie } = await start(env)
    const res = await finish(env, state, cookie)
    assert.equal(fragment(res), '#gz_login_error=not-member')
    assert.equal(env.kv.get('connections'), undefined)
  } finally {
    restore()
  }
})

test('estado inválido, cookie ausente, permiso rechazado o error de Discord: vuelve con el motivo', async () => {
  const env = makeEnv()
  env.kv.set('members', JSON.stringify(members))
  const { state, cookie } = await start(env)
  assert.equal(fragment(await finish(env, 'otro-estado', cookie)), '#gz_login_error=state')
  assert.equal(fragment(await call(env, `/auth/callback?code=abc&state=${state}`)), '#gz_login_error=state')
  assert.equal(fragment(await finish(env, state, cookie, '&error=access_denied')), '#gz_login_error=denied')
  const restore = fakeDiscord({ tokenOk: false })
  try {
    assert.equal(fragment(await finish(env, state, cookie)), '#gz_login_error=exchange')
  } finally {
    restore()
  }
})

test('la sesión: una firma alterada o vencida no vale', async () => {
  const secret = 'abc'
  const ok = await signToken({ sub: '1', exp: Date.now() + 1000 }, secret)
  assert.equal((await verifyToken(ok, secret)).sub, '1')
  assert.equal(await verifyToken(ok, 'otro-secreto'), null)
  assert.equal(await verifyToken(`${ok.split('.')[0]}.AAAA`, secret), null)
  assert.equal(await verifyToken(await signToken({ sub: '1', exp: Date.now() - 1 }, secret), secret), null)
  assert.equal(await verifyToken('basura', secret), null)
  const env = makeEnv()
  assert.equal((await call(env, '/auth/me')).status, 401)
  assert.equal((await call(env, '/auth/me', { headers: { Authorization: 'Bearer x.y' } })).status, 401)
})

test('cada persona puede quitar sus conexiones, y solo las suyas', async () => {
  const env = makeEnv()
  env.kv.set('connections', JSON.stringify({ 42: [{ t: 'steam', n: 'a', i: '1' }], 7: [{ t: 'github', n: 'b', i: '2' }] }))
  const token = await signToken({ sub: '42', n: 'Nox', exp: Date.now() + 60000 }, env.SESSION_SECRET)
  assert.equal((await call(env, '/api/me/connections', { method: 'DELETE' })).status, 401)
  const res = await call(env, '/api/me/connections', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  assert.equal(res.status, 204)
  assert.deepEqual(JSON.parse(env.kv.get('connections')), { 7: [{ t: 'github', n: 'b', i: '2' }] })
})

test('publicConnections limpia, recorta y respeta la visibilidad', () => {
  const list = publicConnections([{ type: 'steam', id: 1, name: 'x'.repeat(200), visibility: 1 }, { type: 'x', id: 2, name: 'y', visibility: 0 }, null])
  assert.equal(list.length, 1)
  assert.equal(list[0].n.length, 64)
  assert.deepEqual(publicConnections('no es lista'), [])
})
