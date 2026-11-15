// Manda los datos a la nube (al Worker de Cloudflare) para que la página publicada pueda leerlos.
// Solo hace pedidos de salida: no hace falta abrir puertos en el router.

const KEEPALIVE_MS = 5 * 60_000

export function createPublisher({ url, token, fetchImpl = fetch, log = console }) {
  let lastBody = null
  let lastPushAt = 0
  let failures = 0

  // Devuelve 'enviado', 'omitido' o 'error'.
  async function push(payload, now = Date.now()) {
    // Sin el campo updatedAt, que cambia siempre, para saber si hubo cambios reales.
    const { updatedAt, ...rest } = payload
    const stable = JSON.stringify(rest)

    // Si no cambió nada no se vuelve a escribir (el plan gratis limita las escrituras por día),
    // pero se avisa al menos cada 5 minutos para que la página sepa que el bot sigue vivo.
    if (stable === lastBody && now - lastPushAt < KEEPALIVE_MS) return 'omitido'

    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) {
        const hint = res.status === 401 ? ' Revisá que PUSH_TOKEN sea el mismo que cargaste en Cloudflare.' : ''
        throw new Error(`HTTP ${res.status}.${hint}`)
      }
      lastBody = stable
      lastPushAt = now
      failures = 0
      return 'enviado'
    } catch (err) {
      failures++
      // Avisa en el primer error y luego cada tanto, para no llenar la consola
      if (failures === 1 || failures % 10 === 0) {
        log.warn(`No pude publicar los datos en la nube: ${err.message} Sigo intentando.`)
      }
      return 'error'
    }
  }

  return { push }
}
