// Lee la actividad de Spotify que Discord muestra en la presencia de cada persona.
//
// Spotify llega como una actividad de tipo "Escuchando" con:
//   details = título de la canción
//   state   = artista(s), separados por ";"
//   assets  = portada del álbum (es lo único "visual" que entrega Discord; no hay foto del artista)
//   syncId  = ID de la canción en Spotify (sirve para armar el link directo)
//   timestamps.end = cuándo termina la canción

export function parseSpotify(activity, nowMs = Date.now()) {
  if (!activity) return null
  const title = String(activity.details ?? '').trim()
  if (!title) return null

  // Si la canción ya terminó (pausada o cortada), no se cuenta
  const end = activity.timestamps?.end
  const endMs = end instanceof Date ? end.getTime() : Number(end) || 0
  if (endMs && endMs < nowMs - 15_000) return null

  const artists = String(activity.state ?? '')
    .split(';')
    .map((a) => a.trim())
    .filter(Boolean)

  let image = null
  try {
    image = typeof activity.assets?.largeImageURL === 'function' ? activity.assets.largeImageURL() : null
  } catch {
    image = null
  }

  const id = /^[A-Za-z0-9]{10,30}$/.test(String(activity.syncId ?? '')) ? String(activity.syncId) : null
  return { title, artists: artists.length ? artists : ['Artista desconocido'], image, id }
}

// Se queda con lo más escuchado para que el archivo no crezca sin límite
export function pruneMusic(store, keep = 100) {
  for (const rec of Object.values(store.members)) {
    for (const key of ['songs', 'artists']) {
      const map = rec[key]
      if (!map) continue
      const sec = (v) => (typeof v === 'number' ? v : v.s)
      const entries = Object.entries(map)
      if (entries.length <= keep) continue
      entries.sort((a, b) => sec(b[1]) - sec(a[1]))
      rec[key] = Object.fromEntries(entries.slice(0, keep))
    }
  }
}
