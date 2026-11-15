import { useEffect, useState } from 'react'
import { MEMBERS } from '../data/mock.js'

// En desarrollo (npm run dev) busca el bot en tu propia PC.
// Para producción, definí VITE_API_URL al compilar (ej: https://api.tudominio.com).
const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '')
const REFRESH_MS = 30_000

// Devuelve { members, meta, live }.
// live = true cuando los datos vienen del bot; si no hay bot, usa los datos de ejemplo.
export function useMembers() {
  const [state, setState] = useState({ members: MEMBERS, meta: null, live: false })

  useEffect(() => {
    if (!API) return
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch(`${API}/api/members`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) setState({ members: data.members, meta: data.meta, live: true })
      } catch {
        // Si ya teníamos datos reales, los dejamos hasta el próximo intento.
        if (!cancelled) setState((s) => (s.live ? s : { members: MEMBERS, meta: null, live: false }))
      }
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return state
}
