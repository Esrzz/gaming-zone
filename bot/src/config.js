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
    tickMs: 30_000, // cada cuánto se suma el tiempo
    saveEveryMs: 5 * 60_000, // cada cuánto se guarda en disco (cuida la SD de la Raspberry)
  }
}
