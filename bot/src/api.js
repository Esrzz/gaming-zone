import http from 'node:http'

// Servidor mínimo (sin dependencias) que entrega los datos a la página.
//   GET /api/members -> JSON con el ranking
//   GET /health      -> para comprobar que el bot está vivo
export function startApi({ port, host, allowedOrigin, getPayload }) {
  const server = http.createServer((req, res) => {
    const cors = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    }
    const send = (status, body, extra = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...extra })
      res.end(JSON.stringify(body))
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors)
      return res.end()
    }
    if (req.method !== 'GET') return send(405, { error: 'Método no permitido' })

    const { pathname } = new URL(req.url, 'http://localhost')

    if (pathname === '/health') return send(200, { ok: true })

    if (pathname === '/api/members') {
      const payload = getPayload()
      if (!payload) return send(503, { error: 'El bot se está iniciando, probá en unos segundos' })
      return send(200, payload, { 'Cache-Control': 'public, max-age=15' })
    }

    send(404, { error: 'No encontrado' })
  })

  server.listen(port, host)
  return server
}
