// Inicio de sesión con Discord (OAuth2) para la página.
//
//   GET    /auth/login            -> manda a Discord a pedir permiso (identify + connections)
//   GET    /auth/callback         <- Discord vuelve acá; se valida, se guardan las conexiones públicas y
//                                    se vuelve a la página con la sesión en el fragmento (#gz_login=...)
//   GET    /auth/me               -> quién es la sesión (necesita "Authorization: Bearer <sesión>")
//   GET    /api/connections       -> conexiones públicas de quienes iniciaron sesión (público, solo lectura)
//   DELETE /api/me/connections    -> la persona quita sus conexiones de la página
//
// La sesión es un token firmado con HMAC (SESSION_SECRET): no se guarda nada en el servidor y no depende de
// cookies entre dominios. El token de acceso de Discord se usa una sola vez y se descarta.
// Otras páginas (ej. Nonogram Zone) pueden usar el mismo inicio de sesión: se listan en EXTRA_SITES (orígenes separados
// por coma) y piden /auth/login?return=<origen>; al terminar, Discord las trae de vuelta a esa página.
// Variables: DISCORD_CLIENT_ID, SITE_URL, EXTRA_SITES (opcional). Secretos: DISCORD_CLIENT_SECRET, SESSION_SECRET.

const DISCORD = 'https://discord.com/api/v10'
const MEMBERS_KEY = 'members'
const CONNECTIONS_KEY = 'connections'
const SESSION_DAYS = 30
const STATE_MINUTES = 10
const MAX_CONNECTIONS = 12

const enc = new TextEncoder()
const dec = new TextDecoder()

const toB64u = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const fromB64u = (s) => Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))

const hmacKey = (secret) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])

export async function signToken(payload, secret) {
  const body = toB64u(enc.encode(JSON.stringify(payload)))
  const sig = toB64u(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)))
  return `${body}.${sig}`
}

// Devuelve el contenido si la firma es válida y no venció; si no, null
export async function verifyToken(token, secret, now = Date.now()) {
  try {
    const [body, sig] = String(token).split('.')
    if (!body || !sig) return null
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64u(sig), enc.encode(body))
    if (!ok) return null
    const payload = JSON.parse(dec.decode(fromB64u(body)))
    return payload.exp && payload.exp < now ? null : payload
  } catch {
    return null
  }
}

const redirect = (url, extra = {}) => new Response(null, { status: 302, headers: { Location: url, ...extra } })
const configured = (env) => env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.SESSION_SECRET && env.SITE_URL
const siteUrl = (env) => String(env.SITE_URL).replace(/\/+$/, '')
const back = (env, key, value, site = siteUrl(env)) => redirect(`${site}/#${key}=${encodeURIComponent(value)}`)

export const extraSites = (env) =>
  String(env.EXTRA_SITES ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)

// Origen al que volver tras el login: solo si está en la lista de páginas permitidas (evita redirecciones abiertas)
export function returnSite(env, value) {
  try {
    const origin = new URL(String(value)).origin
    return extraSites(env).includes(origin) ? origin : null
  } catch {
    return null
  }
}

function readCookie(request, name) {
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return null
}

export async function sessionOf(request, env) {
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')
  if (!m || !env.SESSION_SECRET) return null
  const s = await verifyToken(m[1], env.SESSION_SECRET)
  return s?.sub ? s : null
}

const readConnections = async (env) => {
  try {
    return JSON.parse((await env.STATS.get(CONNECTIONS_KEY)) ?? '{}') || {}
  } catch {
    return {}
  }
}

// Solo lo que la persona tiene como "visible para todos" en su perfil de Discord
export function publicConnections(list) {
  return (Array.isArray(list) ? list : [])
    .filter((c) => c && c.visibility === 1 && c.verified !== false && c.type && c.name)
    .slice(0, MAX_CONNECTIONS)
    .map((c) => ({ t: String(c.type).slice(0, 32), n: String(c.name).slice(0, 64), i: String(c.id ?? '').slice(0, 64) }))
}

async function login(request, env) {
  if (!configured(env)) return null
  const nonce = toB64u(crypto.getRandomValues(new Uint8Array(18)))
  const ret = returnSite(env, new URL(request.url).searchParams.get('return'))
  const cookie = await signToken({ nonce, ret, exp: Date.now() + STATE_MINUTES * 60_000 }, env.SESSION_SECRET)
  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('client_id', env.DISCORD_CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', `${new URL(request.url).origin}/auth/callback`)
  url.searchParams.set('scope', 'identify connections')
  url.searchParams.set('state', nonce)
  url.searchParams.set('prompt', 'none') // si ya aceptó antes, no vuelve a preguntar
  return redirect(url.toString(), {
    'Set-Cookie': `gz_oauth=${cookie}; Max-Age=${STATE_MINUTES * 60}; Path=/auth; HttpOnly; Secure; SameSite=Lax`,
  })
}

async function callback(request, env) {
  if (!configured(env)) return null
  const url = new URL(request.url)
  const clear = { 'Set-Cookie': 'gz_oauth=; Max-Age=0; Path=/auth; HttpOnly; Secure; SameSite=Lax' }
  let site = siteUrl(env)
  const fail = (why) => {
    const r = back(env, 'gz_login_error', why, site)
    r.headers.set('Set-Cookie', clear['Set-Cookie'])
    return r
  }

  if (url.searchParams.get('error')) return fail('denied')

  const saved = await verifyToken(readCookie(request, 'gz_oauth') ?? '', env.SESSION_SECRET)
  if (saved?.ret && returnSite(env, saved.ret)) site = saved.ret
  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')
  if (!saved || !state || saved.nonce !== state || !code) return fail('state')

  let user
  let connections = []
  try {
    const tokenRes = await fetch(`${DISCORD}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${url.origin}/auth/callback`,
      }),
    })
    if (!tokenRes.ok) return fail('exchange')
    const { access_token: accessToken } = await tokenRes.json()
    const auth = { Authorization: `Bearer ${accessToken}` }
    const [me, conns] = await Promise.all([fetch(`${DISCORD}/users/@me`, { headers: auth }), fetch(`${DISCORD}/users/@me/connections`, { headers: auth })])
    if (!me.ok) return fail('exchange')
    user = await me.json()
    if (conns.ok) connections = publicConnections(await conns.json())
  } catch {
    return fail('exchange')
  }

  // Solo entran los que están en el servidor (la lista la manda el bot)
  const raw = await env.STATS.get(MEMBERS_KEY)
  if (!raw) return fail('unavailable')
  let member
  try {
    member = JSON.parse(raw).members?.find((m) => m.id === user.id)
  } catch {
    return fail('unavailable')
  }
  if (!member) return fail('not-member')

  // Guarda (o actualiza) sus conexiones públicas; si no tiene, se borra lo anterior
  try {
    const all = await readConnections(env)
    if (connections.length) all[user.id] = connections
    else delete all[user.id]
    await env.STATS.put(CONNECTIONS_KEY, JSON.stringify(all))
  } catch (err) {
    console.error('No se pudieron guardar las conexiones:', err?.message ?? err) // inicia sesión igual
  }

  const token = await signToken({ sub: user.id, n: member.name ?? user.global_name ?? user.username, exp: Date.now() + SESSION_DAYS * 86_400_000 }, env.SESSION_SECRET)
  const r = back(env, 'gz_login', token, site)
  r.headers.set('Set-Cookie', clear['Set-Cookie'])
  return r
}

// Devuelve una Response si la ruta es de login, o null si no es asunto de este archivo
export async function handleAuth(request, env, pathname, headers, json) {
  if (pathname === '/auth/login' || pathname === '/auth/callback') {
    if (request.method !== 'GET') return json({ error: 'Usá GET' }, 405, headers)
    const res = await (pathname === '/auth/login' ? login(request, env) : callback(request, env))
    return res ?? json({ error: 'El inicio de sesión todavía no está configurado en el Worker.' }, 503, headers)
  }

  if (pathname === '/auth/me') {
    if (request.method !== 'GET') return json({ error: 'Usá GET' }, 405, headers)
    const s = await sessionOf(request, env)
    return s ? json({ id: s.sub, name: s.n }, 200, headers) : json({ error: 'Sesión inválida o vencida' }, 401, headers)
  }

  if (pathname === '/api/connections') {
    if (request.method !== 'GET') return json({ error: 'Usá GET' }, 405, headers)
    const body = await env.STATS.get(CONNECTIONS_KEY, { cacheTtl: 60 })
    return new Response(body ?? '{}', { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', ...headers } })
  }

  if (pathname === '/api/me/connections') {
    if (request.method !== 'DELETE') return json({ error: 'Usá DELETE' }, 405, headers)
    const s = await sessionOf(request, env)
    if (!s) return json({ error: 'Sesión inválida o vencida' }, 401, headers)
    const all = await readConnections(env)
    delete all[s.sub]
    try {
      await env.STATS.put(CONNECTIONS_KEY, JSON.stringify(all))
    } catch {
      return json({ error: 'No se pudo guardar ahora. Probá de nuevo más tarde.' }, 503, headers)
    }
    return new Response(null, { status: 204, headers })
  }

  return null
}
