// Registro de novedades ("quién le sacó qué a quién"). Cada evento es chico (~120 bytes):
//   { t: fecha en ms, k: tipo, ... }
//   k = 'record'  { rid, who:[{id,n}], from:[{id,n}], v, pv }  alguien superó un récord (v = valor nuevo, pv = anterior)
//   k = 'tie'     { rid, who:[{id,n}], v }                       alguien igualó un récord
//   k = 'master'  { game, who:[{id,n}], from:[{id,n}] }          nuevo Master (1.º) de un juego
//   k = 'podium'  { game, rank, who:[{id,n}] }                   alguien entró al podio de un juego (2.º o 3.º)
// En el archivo del bot se guardan hasta MAX_EVENTS (y nada de más de MAX_AGE_DAYS);
// a la página solo se mandan los últimos SEND_EVENTS, del más nuevo al más viejo.

export const MAX_EVENTS = 500
export const MAX_AGE_DAYS = 30
export const SEND_EVENTS = 100

export function pruneEvents(store, now = new Date()) {
  if (!store.events) return
  const limit = now.getTime() - MAX_AGE_DAYS * 86_400_000
  store.events = store.events.filter((e) => e.t >= limit).slice(-MAX_EVENTS)
}

export function addEvent(store, event, now) {
  ;(store.events ??= []).push({ t: now.getTime(), ...event })
  pruneEvents(store, now)
}

export const publicEvents = (store) => (store.events ?? []).slice(-SEND_EVENTS).reverse()
