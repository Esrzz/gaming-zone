import { useCallback, useEffect, useState } from 'react'
import { API } from '../lib/api.js'
import { checkSession, consumeLoginFragment, readToken, removeMyConnections, storeToken, userFromToken } from '../lib/auth.js'

const ERRORS = {
  denied: 'Cancelaste el inicio de sesión.',
  'not-member': 'Esa cuenta de Discord no está en el servidor. Unite y probá de nuevo.',
  unavailable: 'No se pudo iniciar sesión ahora. Probá de nuevo en un rato.',
  state: 'El inicio de sesión se interrumpió. Probá de nuevo.',
  exchange: 'Discord no respondió bien. Probá de nuevo.',
}

// Sesión de la persona, avisos y conexiones públicas de todos.
export function useAuth() {
  const [token, setToken] = useState(() => readToken())
  const [notice, setNotice] = useState(null)
  const [connections, setConnections] = useState({})
  const user = token ? userFromToken(token) : null

  // Al volver de Discord
  useEffect(() => {
    const result = consumeLoginFragment()
    if (!result) return
    if (result.token) {
      const u = userFromToken(result.token)
      if (u) {
        storeToken(result.token)
        setToken(result.token)
        setNotice({ kind: 'ok', text: `Hola, ${u.name}. Ya iniciaste sesión.` })
      }
    } else {
      setNotice({ kind: 'error', text: ERRORS[result.error] ?? ERRORS.exchange, invite: result.error === 'not-member' })
    }
  }, [])

  // Si el Worker dice que la sesión ya no vale, se cierra
  useEffect(() => {
    if (!token) return
    let cancelled = false
    checkSession(token)
      .then((ok) => {
        if (!ok && !cancelled) {
          storeToken(null)
          setToken(null)
          setNotice({ kind: 'error', text: 'Tu sesión venció. Iniciá sesión de nuevo.' })
        }
      })
      .catch(() => {}) // sin conexión con el Worker: se deja la sesión como está
    return () => {
      cancelled = true
    }
  }, [token])

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/connections`)
      if (res.ok) setConnections(await res.json())
    } catch {
      /* sin conexiones por ahora */
    }
  }, [])

  useEffect(() => {
    loadConnections()
    const id = setInterval(() => !document.hidden && loadConnections(), 5 * 60_000)
    return () => clearInterval(id)
  }, [loadConnections])

  const logout = useCallback(() => {
    storeToken(null)
    setToken(null)
    setNotice({ kind: 'ok', text: 'Cerraste la sesión.' })
  }, [])

  const removeConnections = useCallback(async () => {
    try {
      await removeMyConnections(token)
      setConnections((c) => {
        const next = { ...c }
        delete next[user?.id]
        return next
      })
      setNotice({ kind: 'ok', text: 'Quitamos tus conexiones de la página.' })
    } catch {
      setNotice({ kind: 'error', text: 'No se pudieron quitar ahora. Probá de nuevo en un rato.' })
    }
  }, [token, user?.id])

  return { user, notice, dismissNotice: () => setNotice(null), connections, logout, removeConnections }
}
