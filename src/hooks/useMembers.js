import { useEffect, useState } from 'react'
import { MEMBERS } from '../data/mock.js'

// En desarrollo (npm run dev) busca el bot en tu propia PC.
// Publicada, usa VITE_API_URL, que se define al compilar (ver PUBLICAR.md).
const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : 'https://gaming-zone-api.gamingzone.workers.dev')
const REFRESH_MS = import.meta.env.DEV ? 30_000 : 60_000

// Si el bot no manda datos hace más que esto, se lo considera desconectado
const STALE_MS = 10 * 60_000

// Con el bot desconectado se conservan las horas, pero no se puede saber
// quién está en línea ni qué juega, así que eso se muestra como desconectado.
function markStale(data) {
  return {
    members: data.members.map((m) => ({ ...m, status: 'offline', inVoice: false, activity: null })),
    meta: data.meta ? { ...data.meta, onlineCount: 0, inVoiceCount: 0 } : null,
    gameIcons: data.gameIcons ?? {},
  }
}

// Devuelve { members, meta, gameIcons, live, stale }.
//   live  = los datos vienen del bot (si no, son los de ejemplo)
//   stale = el bot dejó de mandar datos hace un rato
export function useMembers() {
  const [state, setState] = useState({ members: MEMBERS, meta: null, gameIcons: {}, live: false, stale: false })

  useEffect(() => {
    if (!API) return
    let cancelled = false

    const load = async () => {
      if (document.hidden) return // pestaña en segundo plano: no gastar pedidos
      try {
        const res = await fetch(`${API}/api/members`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const age = Date.now() - Date.parse(data.updatedAt)
        const stale = !(age <= STALE_MS)
        const next = stale ? markStale(data) : { members: data.members, meta: data.meta, gameIcons: data.gameIcons ?? {} }
        if (!cancelled) setState({ ...next, live: true, stale })
      } catch {
        // Si ya teníamos datos reales, los dejamos hasta el próximo intento.
        if (!cancelled) {
          setState((s) => (s.live ? s : { members: MEMBERS, meta: null, gameIcons: {}, live: false, stale: false }))
        }
      }
    }

    const onVisible = () => {
      if (!document.hidden) load()
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return state
}
