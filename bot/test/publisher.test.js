import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublisher } from '../src/publisher.js'

const payload = (name = 'Nox', updatedAt = '2026-11-14T22:00:00Z') => ({
  updatedAt,
  meta: { memberCount: 40 },
  members: [{ id: '1', name }],
})

function setup(responses = []) {
  const calls = []
  const warnings = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    const next = responses.shift() ?? { ok: true, status: 204 }
    if (next.throws) throw new Error(next.throws)
    return next
  }
  const pub = createPublisher({
    url: 'https://api.test/api/push',
    token: 'tok',
    fetchImpl,
    log: { warn: (m) => warnings.push(m) },
  })
  return { pub, calls, warnings }
}

test('envía con el token y el cuerpo en JSON', async () => {
  const { pub, calls } = setup()
  assert.equal(await pub.push(payload(), 1000), 'enviado')
  assert.equal(calls[0].url, 'https://api.test/api/push')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer tok')
  assert.deepEqual(JSON.parse(calls[0].init.body).members, [{ id: '1', name: 'Nox' }])
})

test('no reenvía si no cambió nada (aunque cambie updatedAt) hasta pasados 5 minutos', async () => {
  const { pub, calls } = setup()
  await pub.push(payload('Nox', 'a'), 0)
  assert.equal(await pub.push(payload('Nox', 'b'), 2 * 60_000), 'omitido')
  assert.equal(calls.length, 1)
  assert.equal(await pub.push(payload('Nox', 'c'), 5 * 60_000 + 1), 'enviado')
  assert.equal(calls.length, 2)
})

test('reenvía enseguida cuando hay cambios', async () => {
  const { pub, calls } = setup()
  await pub.push(payload('Nox'), 0)
  assert.equal(await pub.push(payload('Kira'), 1000), 'enviado')
  assert.equal(calls.length, 2)
})

test('un error no corta nada y se reintenta con el mismo contenido', async () => {
  const { pub, calls, warnings } = setup([{ throws: 'sin internet' }, { ok: true, status: 204 }])
  assert.equal(await pub.push(payload(), 0), 'error')
  assert.equal(await pub.push(payload(), 1000), 'enviado') // como falló, no se consideró enviado
  assert.equal(calls.length, 2)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /sin internet/)
})

test('un 401 explica que hay que revisar el token', async () => {
  const { pub, warnings } = setup([{ ok: false, status: 401 }])
  assert.equal(await pub.push(payload(), 0), 'error')
  assert.match(warnings[0], /PUSH_TOKEN/)
})

test('los avisos de error no se repiten en cada intento', async () => {
  const { pub, warnings } = setup(Array.from({ length: 12 }, () => ({ throws: 'caído' })))
  for (let i = 0; i < 12; i++) await pub.push(payload(), i * 1000)
  assert.equal(warnings.length, 2) // primer error y el décimo
})
