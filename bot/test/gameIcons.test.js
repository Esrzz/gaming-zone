import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyStore } from '../src/store.js'
import { createIconResolver } from '../src/gameIcons.js'

const reply = (status, body) => async () => ({ ok: status < 400, status, json: async () => body })

test('arma la URL del ícono con el hash que devuelve Discord', async () => {
  const store = emptyStore()
  store.gameApps = { Valorant: '42' }
  const r = createIconResolver({ store, fetchImpl: reply(200, { icon: 'abc' }) })
  assert.equal(await r.resolve(), 1)
  assert.equal(store.gameIcons.Valorant, 'https://cdn.discordapp.com/app-icons/42/abc.png?size=64')
})

test('si falla o no tiene ícono, no se guarda y se reintenta recién después', async () => {
  const store = emptyStore()
  store.gameApps = { A: '1', B: '2' }
  let calls = 0
  let t = 0
  const fetchImpl = async (url) => {
    if (url.endsWith('/detectable')) return { ok: true, json: async () => [] }
    calls++
    return url.includes('/1/') ? { ok: false, status: 404 } : { ok: true, json: async () => ({ icon: null }) }
  }
  const r = createIconResolver({ store, fetchImpl, now: () => t, retryMs: 1000 })
  await r.resolve()
  assert.deepEqual(store.gameIcons, {})
  await r.resolve()
  assert.equal(calls, 2) // no insiste enseguida
  t = 2000
  await r.resolve()
  assert.equal(calls, 4)
})

test('no vuelve a pedir lo que ya tiene', async () => {
  const store = emptyStore()
  store.gameApps = { A: '1' }
  store.gameIcons = { A: 'x' }
  const r = createIconResolver({ store, fetchImpl: () => assert.fail('no debería pedir') })
  assert.equal(await r.resolve(), 0)
})

test('sin applicationId, busca el ícono por nombre en la lista de Discord', async () => {
  const store = emptyStore()
  store.members = { 1: { games: { Valorant: 5 }, ranchoGames: {} } }
  const fetchImpl = reply(200, [{ id: '7', name: 'VALORANT', icon: 'h7' }])
  const r = createIconResolver({
    store,
    fetchImpl,
    extraGames: () => Object.keys(store.members[1].games),
  })
  assert.equal(await r.resolve(), 1)
  assert.equal(store.gameIcons.Valorant, 'https://cdn.discordapp.com/app-icons/7/h7.png?size=64')
})
