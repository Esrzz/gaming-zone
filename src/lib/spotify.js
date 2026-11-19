// Links a Spotify. Con el ID de la canción va directo a ella; si no, abre una búsqueda.
const BASE = 'https://open.spotify.com'

export const trackUrl = ({ id, title, artist }) =>
  id ? `${BASE}/track/${id}` : `${BASE}/search/${encodeURIComponent(`${artist ?? ''} ${title}`.trim())}`

export const artistUrl = (name) => `${BASE}/search/${encodeURIComponent(name)}/artists`
