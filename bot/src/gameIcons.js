// Busca el ícono de cada juego en Discord.
//
// Cuando alguien juega, Discord informa el "applicationId" del juego. Con ese ID se pide
// el dato público de la aplicación (https://discord.com/api/v10/applications/ID/rpc, sin token)
// y de ahí sale el hash del ícono, que vive en el CDN de Discord.
// Los juegos que Discord no conoce (o que no mandan applicationId) quedan sin ícono: la página
// muestra una inicial de color y se les puede poner uno a mano (ver README).

const API = 'https://discord.com/api/v10/applications'
const CDN = 'https://cdn.discordapp.com/app-icons'

export function iconUrl(appId, hash) {
  return `${CDN}/${appId}/${hash}.png?size=64`
}

export function createIconResolver({
  store,
  fetchImpl = fetch,
  now = Date.now,
  retryMs = 6 * 60 * 60_000,
  maxPerRun = 12,
  log = () => {},
  extraGames,
}) {
  const failedAt = new Map() // en memoria: se reintenta cada tanto sin ensuciar el archivo

  // Lista pública de juegos que Discord reconoce (con su ícono). Sirve para los juegos
  // que el bot jugó antes de guardar el ID, o cuando el pedido individual no trae ícono.
  let detectable = null
  let detectableAt = 0
  async function loadDetectable() {
    if (detectable && now() - detectableAt < 24 * 60 * 60_000) return detectable
    const res = await fetchImpl(`${API}/detectable`, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const list = await res.json()
    const byId = new Map()
    const byName = new Map()
    for (const a of list) {
      if (!a?.icon) continue
      byId.set(String(a.id), iconUrl(a.id, a.icon))
      for (const n of [a.name, ...(a.aliases ?? [])]) if (n) byName.set(String(n).toLowerCase(), iconUrl(a.id, a.icon))
    }
    detectable = { byId, byName }
    detectableAt = now()
    return detectable
  }

  async function lookup(game, appId) {
    try {
      if (appId) {
        const url = await lookupApp(appId)
        if (url) return url
      }
    } catch (err) {
      log(`Pedido individual falló para "${game}": ${err.message}`)
    }
    const d = await loadDetectable()
    return (appId && d.byId.get(String(appId))) || d.byName.get(game.toLowerCase()) || null
  }

  async function lookupApp(appId) {
    const res = await fetchImpl(`${API}/${appId}/rpc`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data?.icon ? iconUrl(appId, data.icon) : null
  }

  // Devuelve cuántos íconos nuevos encontró
  async function resolve() {
    store.gameApps ??= {}
    store.gameIcons ??= {}
    let tried = 0
    let found = 0
    const games = new Set([...Object.keys(store.gameApps), ...(extraGames?.() ?? [])])
    for (const game of games) {
      const appId = store.gameApps[game]
      if (store.gameIcons[game]) continue
      const failed = failedAt.get(game)
      if (failed !== undefined && now() - failed < retryMs) continue
      if (tried++ >= maxPerRun) break
      try {
        const url = await lookup(game, appId)
        if (url) {
          store.gameIcons[game] = url
          found++
        } else {
          failedAt.set(game, now())
          log(`Discord no tiene ícono para "${game}"`)
        }
      } catch (err) {
        failedAt.set(game, now())
        log(`No pude pedir el ícono de "${game}": ${err.message}`)
      }
    }
    if (found) log(`Íconos nuevos encontrados: ${found}`)
    return found
  }

  return { resolve }
}
