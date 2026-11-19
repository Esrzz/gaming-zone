import { API } from './api.js'

// La sesión es un token que firma el Worker al volver de Discord. Se guarda en este navegador
// (localStorage) y se manda en el encabezado Authorization; el Worker es quien la valida.
const KEY = 'gz-session'

export const loginUrl = `${API}/auth/login`

export function readToken() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function storeToken(token) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch {
    /* sin almacenamiento: la sesión dura hasta cerrar la pestaña */
  }
}

// Lee los datos del token solo para mostrarlos (nombre); la validez la comprueba el Worker
export function userFromToken(token) {
  try {
    const part = token.split('.')[0].replaceAll('-', '+').replaceAll('_', '/')
    const bytes = Uint8Array.from(atob(part), (c) => c.charCodeAt(0))
    const p = JSON.parse(new TextDecoder().decode(bytes))
    return p.sub && (!p.exp || p.exp > Date.now()) ? { id: p.sub, name: p.n } : null
  } catch {
    return null
  }
}

// Al volver de Discord el Worker deja el resultado en el fragmento de la dirección
// (#gz_login=<sesión> o #gz_login_error=<motivo>). Se lee una vez y se borra de la barra.
export function consumeLoginFragment() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const token = params.get('gz_login')
  const error = params.get('gz_login_error')
  if (!token && !error) return null
  history.replaceState(null, '', window.location.pathname + window.location.search)
  return { token, error }
}

export async function checkSession(token) {
  const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 401) return false
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return true
}

export async function removeMyConnections(token) {
  const res = await fetch(`${API}/api/me/connections`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
