export const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

// Menos de una hora se muestra en minutos, para que algo recién probado no figure como "0 h"
export const fmtHours = (h) => (h < 1 ? `${Math.max(h > 0 ? 1 : 0, Math.round(h * 60))} min` : `${nf.format(h)} h`)

// Minutos -> "1 h 20 min"
export function fmtMinutes(min) {
  if (min < 60) return `${Math.max(1, min)} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export const fmtDate = (iso) =>
  new Date(iso).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const STATUS_LABEL = { online: 'En línea', idle: 'Ausente', dnd: 'No molestar', offline: 'Desconectado' }
