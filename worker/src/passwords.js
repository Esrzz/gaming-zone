// Contraseña de perfil para Nonogram Zone.
//
// Quien entra con Discord por primera vez crea una contraseña; después, quien entre solo con el nombre de ese perfil
// tiene que ponerla. Los perfiles que nunca entraron con Discord no tienen contraseña (entrada libre, como antes).
//
//   GET  /nz/pw/status?name=Nox  -> { member, protected }   ¿ese nombre es de un miembro y tiene contraseña?
//   GET  /nz/pw/me               -> { set }                 (con la sesión) ¿ya creé mi contraseña?
//   POST /nz/pw/set              -> crea la contraseña (con la sesión); para cambiarla pide también "current"
//   POST /nz/pw/login            -> { name, password } → una sesión nueva (mismo formato que la de Discord)
//
// Se guarda solo un hash PBKDF2 con sal (nunca la contraseña) en el mismo KV (clave "pw:<id>").
// Los intentos fallidos se limitan por perfil: 5 cada 15 minutos.

import { sessionOf, signToken } from './auth.js'

const MEMBERS_KEY = 'members'
const MIN_LEN = 6
const MAX_LEN = 72
const ITERATIONS = 100_000 // el máximo que permite Cloudflare Workers
const MAX_FAILS = 5
const LOCK_SECONDS = 15 * 60
const SESSION_DAYS = 30

const enc = new TextEncoder()
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256))
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { s: b64(salt), h: b64(await derive(password, salt, ITERATIONS)), i: ITERATIONS }
}

export async function checkPassword(password, rec) {
  const got = await derive(password, unb64(rec.s), rec.i)
  const want = unb64(rec.h)
  let diff = got.length ^ want.length
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i]
  return diff === 0
}

const readJson = async (request) => {
  try {
    return await request.json()
  } catch {
    return null
  }
}
const validPassword = (p) => typeof p === 'string' && p.length >= MIN_LEN && p.length <= MAX_LEN

async function findMember(env, name) {
  try {
    const list = JSON.parse((await env.STATS.get(MEMBERS_KEY)) ?? 'null')?.members ?? []
    const want = String(name ?? '').trim().toLowerCase()
    return want ? list.find((m) => String(m.name ?? '').trim().toLowerCase() === want) ?? null : null
  } catch {
    return null
  }
}

const getRecord = async (env, id) => {
  try {
    return JSON.parse((await env.STATS.get(`pw:${id}`)) ?? 'null')
  } catch {
    return null
  }
}

async function failures(env, id) {
  return Number(await env.STATS.get(`pwfail:${id}`)) || 0
}
const addFailure = (env, id, n) => env.STATS.put(`pwfail:${id}`, String(n + 1), { expirationTtl: LOCK_SECONDS })

export async function handlePassword(request, env, pathname, headers, json) {
  if (!pathname.startsWith('/nz/pw/')) return null
  const need = (method) => (request.method === method ? null : json({ error: `Usá ${method}` }, 405, headers))

  if (pathname === '/nz/pw/status') {
    const bad = need('GET')
    if (bad) return bad
    const m = await findMember(env, new URL(request.url).searchParams.get('name'))
    return json({ member: !!m, protected: m ? !!(await getRecord(env, m.id)) : false }, 200, headers)
  }

  if (pathname === '/nz/pw/me') {
    const bad = need('GET')
    if (bad) return bad
    const s = await sessionOf(request, env)
    if (!s) return json({ error: 'Sesión inválida o vencida' }, 401, headers)
    return json({ set: !!(await getRecord(env, s.sub)) }, 200, headers)
  }

  if (pathname === '/nz/pw/set') {
    const bad = need('POST')
    if (bad) return bad
    const s = await sessionOf(request, env)
    if (!s) return json({ error: 'Sesión inválida o vencida' }, 401, headers)
    const body = await readJson(request)
    if (!validPassword(body?.password)) return json({ error: `La contraseña debe tener entre ${MIN_LEN} y ${MAX_LEN} caracteres.` }, 400, headers)

    const rec = await getRecord(env, s.sub)
    if (rec) {
      // Cambiar una contraseña existente exige la actual (y cuenta los intentos fallidos)
      const fails = await failures(env, s.sub)
      if (fails >= MAX_FAILS) return json({ error: 'locked' }, 429, headers)
      if (typeof body.current !== 'string' || !(await checkPassword(body.current, rec))) {
        await addFailure(env, s.sub, fails)
        return json({ error: 'wrong' }, 403, headers)
      }
    }
    try {
      await env.STATS.put(`pw:${s.sub}`, JSON.stringify(await hashPassword(body.password)))
    } catch {
      return json({ error: 'No se pudo guardar ahora. Probá de nuevo más tarde.' }, 503, headers)
    }
    return new Response(null, { status: 204, headers })
  }

  if (pathname === '/nz/pw/login') {
    const bad = need('POST')
    if (bad) return bad
    if (!env.SESSION_SECRET) return json({ error: 'El inicio de sesión todavía no está configurado en el Worker.' }, 503, headers)
    const body = await readJson(request)
    const m = await findMember(env, body?.name)
    const rec = m ? await getRecord(env, m.id) : null
    if (!m || !rec) return json({ error: 'wrong' }, 403, headers) // misma respuesta: no revela si el perfil existe
    const fails = await failures(env, m.id)
    if (fails >= MAX_FAILS) return json({ error: 'locked' }, 429, headers)
    if (typeof body.password !== 'string' || body.password.length > MAX_LEN || !(await checkPassword(body.password, rec))) {
      await addFailure(env, m.id, fails)
      return json({ error: 'wrong', left: MAX_FAILS - fails - 1 }, 403, headers)
    }
    const token = await signToken({ sub: m.id, n: m.name, exp: Date.now() + SESSION_DAYS * 86_400_000 }, env.SESSION_SECRET)
    return json({ token, id: m.id, name: m.name }, 200, headers)
  }

  return json({ error: 'No encontrado' }, 404, headers)
}
