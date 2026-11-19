// Cómo se muestra cada tipo de conexión de Discord y a qué perfil lleva.
// url() recibe { n: nombre, i: id } y devuelve la dirección del perfil, o null si esa plataforma no tiene perfil público.
const e = encodeURIComponent

export const PLATFORMS = {
  steam: { label: 'Steam', url: (c) => `https://steamcommunity.com/profiles/${e(c.i)}` },
  spotify: { label: 'Spotify', url: (c) => `https://open.spotify.com/user/${e(c.i)}` },
  twitch: { label: 'Twitch', url: (c) => `https://www.twitch.tv/${e(c.n)}` },
  youtube: { label: 'YouTube', url: (c) => `https://www.youtube.com/channel/${e(c.i)}` },
  github: { label: 'GitHub', url: (c) => `https://github.com/${e(c.n)}` },
  twitter: { label: 'X', url: (c) => `https://x.com/${e(c.n)}` },
  reddit: { label: 'Reddit', url: (c) => `https://www.reddit.com/user/${e(c.n)}` },
  instagram: { label: 'Instagram', url: (c) => `https://www.instagram.com/${e(c.n)}` },
  tiktok: { label: 'TikTok', url: (c) => `https://www.tiktok.com/@${e(c.n)}` },
  bluesky: { label: 'Bluesky', url: (c) => `https://bsky.app/profile/${e(c.n)}` },
  facebook: { label: 'Facebook', url: (c) => `https://www.facebook.com/${e(c.i)}` },
  roblox: { label: 'Roblox', url: (c) => `https://www.roblox.com/users/${e(c.i)}/profile` },
  xbox: { label: 'Xbox', url: (c) => `https://account.xbox.com/profile?gamertag=${e(c.n)}` },
  ebay: { label: 'eBay', url: (c) => `https://www.ebay.com/usr/${e(c.n)}` },
  domain: { label: 'Sitio web', url: (c) => (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(c.n) ? `https://${c.n}` : null) },
  // Sin perfil público al que se pueda llevar: se muestra el nombre
  playstation: { label: 'PlayStation' },
  epicgames: { label: 'Epic Games' },
  battlenet: { label: 'Battle.net' },
  riotgames: { label: 'Riot Games' },
  leagueoflegends: { label: 'League of Legends' },
  crunchyroll: { label: 'Crunchyroll' },
  paypal: { label: 'PayPal' },
  mastodon: { label: 'Mastodon' },
  'amazon-music': { label: 'Amazon Music' },
  skype: { label: 'Skype' },
  bungie: { label: 'Bungie' },
}

export function describe(c) {
  const p = PLATFORMS[c.t]
  let href = null
  try {
    href = p?.url?.(c) ?? null
  } catch {
    href = null
  }
  return { label: p?.label ?? c.t, href: href && href.startsWith('https://') ? href : null }
}
