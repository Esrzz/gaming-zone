import 'dotenv/config'
import { fileURLToPath } from 'node:url'

const list = (value) =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export function loadConfig(env = process.env) {
  const missing = ['DISCORD_TOKEN', 'GUILD_ID'].filter((key) => !env[key])
  if (missing.length) {
    throw new Error(
      `Falta completar en el archivo .env: ${missing.join(', ')}.\n` +
        'Copiá .env.example como .env y completalo (la guía está en README.md).',
    )
  }

  if (env.PUSH_URL && !env.PUSH_TOKEN) {
    throw new Error('Si usás PUSH_URL, también hay que completar PUSH_TOKEN en el archivo .env.')
  }

  return {
    token: env.DISCORD_TOKEN,
    guildId: env.GUILD_ID,
    port: Number(env.PORT) || 3001,
    host: env.HOST || '0.0.0.0',
    allowedOrigin: env.ALLOWED_ORIGIN || '*',
    timezone: env.TIMEZONE || 'America/Argentina/Buenos_Aires',
    excludeIds: new Set(list(env.EXCLUDE_IDS)),
    voiceRequiresGame: env.COUNT_VOICE_ONLY_WHEN_PLAYING === 'true',
    streakMinSeconds: (Number(env.STREAK_MIN_MINUTES) || 10) * 60,
    dataFile: env.DATA_FILE || fileURLToPath(new URL('../data/stats.json', import.meta.url)),
    // Publicación en la nube (opcional, para cuando la página está en internet)
    pushUrl: env.PUSH_URL || '',
    pushToken: env.PUSH_TOKEN || '',
    // Mínimo 90 s: el plan gratis de Cloudflare permite 1.000 escrituras por día
    pushEveryMs: Math.max(90, Number(env.PUSH_EVERY_SECONDS) || 120) * 1000,
    tickMs: 30_000, // cada cuánto se suma el tiempo
    saveEveryMs: 5 * 60_000, // cada cuánto se guarda en disco (cuida la SD de la Raspberry)
  }
}
