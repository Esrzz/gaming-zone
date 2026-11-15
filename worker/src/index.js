// Puente entre el bot (que corre en tu PC o Raspberry) y la página (que está en internet).
//
//   POST /api/push     <- el bot manda los datos (necesita el token secreto)
//   GET  /api/members  -> la página los lee (público, solo lectura)
//   GET  /health       -> para comprobar que el Worker está vivo
//
// Variables: PUSH_TOKEN (secreto), ALLOWED_ORIGIN. Binding de KV: STATS.

const KEY = 'members'
const MAX_BODY_CHARS = 256 * 1024

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}

// Comparación en tiempo constante, para no filtrar el token por diferencias de tiempo.
function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function isAuthorized(request, env) {
  if (!env.PUSH_TOKEN) return false // sin token configurado, nadie puede escribir
  const given = request.headers.get('Authorization') ?? ''
  return safeEqual(given, `Bearer ${env.PUSH_TOKEN}`)
}

export default {
  async fetch(request, env) {
    const headers = cors(env)
    const { pathname } = new URL(request.url)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

    if (pathname === '/health') return json({ ok: true }, 200, headers)

    if (pathname === '/api/push') {
      if (request.method !== 'POST') return json({ error: 'Usá POST' }, 405, headers)
      if (!isAuthorized(request, env)) return json({ error: 'No autorizado' }, 401, headers)

      const text = await request.text()
      if (text.length > MAX_BODY_CHARS) return json({ error: 'Datos demasiado grandes' }, 413, headers)

      let data
      try {
        data = JSON.parse(text)
      } catch {
        return json({ error: 'JSON inválido' }, 400, headers)
      }
      if (!data || !Array.isArray(data.members)) return json({ error: 'Formato inesperado' }, 400, headers)

      await env.STATS.put(KEY, text)
      return new Response(null, { status: 204, headers })
    }

    if (pathname === '/api/members') {
      if (request.method !== 'GET') return json({ error: 'Usá GET' }, 405, headers)

      // cacheTtl: Cloudflare reutiliza el valor unos segundos y se gastan menos lecturas del plan gratis
      const body = await env.STATS.get(KEY, { cacheTtl: 30 })
      if (!body) return json({ error: 'Todavía no llegaron datos del bot' }, 503, headers)

      return new Response(body, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=30',
          ...headers,
        },
      })
    }

    return json({ error: 'No encontrado' }, 404, headers)
  },
}
