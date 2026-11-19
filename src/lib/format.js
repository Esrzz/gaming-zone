export const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

// Duración siempre igual en toda la página: "35 min", "2 h", "1 h 39 min", "1.234 h 30 min" (nunca decimales)
const nInt = new Intl.NumberFormat('es-AR')
function fmtDuration(totalMinutes, keepSmall = false) {
  const total = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${keepSmall && m === 0 ? 1 : m} min`
  return m ? `${nInt.format(h)} h ${m} min` : `${nInt.format(h)} h`
}
// Horas (pueden venir con decimales) -> duración. Algo recién empezado no figura como "0 min".
export const fmtHours = (h) => fmtDuration(h * 60, h > 0)
// Minutos -> duración
export const fmtMinutes = (min) => fmtDuration(min, min > 0)

export const fmtDate = (iso) =>
  new Date(iso).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const STATUS_LABEL = { online: 'En línea', idle: 'Ausente', dnd: 'No molestar', offline: 'Desconectado' }

// "hace 5 min", "hace 3 h", "hace 2 días"
export function fmtAgo(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 60) return 'hace un momento'
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}
