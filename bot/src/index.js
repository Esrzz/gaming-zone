import { Client, GatewayIntentBits, ActivityType, Events } from 'discord.js'
import { loadConfig } from './config.js'
import { loadStore, saveStore } from './store.js'
import { applyTick, buildPublic, dayKey, pruneOldDays } from './tracker.js'
import { startApi } from './api.js'

let cfg
try {
  cfg = loadConfig()
} catch (err) {
  console.error(`\n${err.message}\n`)
  process.exit(1)
}

let store
try {
  store = loadStore(cfg.dataFile)
} catch (err) {
  console.error(`\n${err.message}\n`)
  process.exit(1)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // lista de miembros (privilegiado)
    GatewayIntentBits.GuildPresences, // qué está jugando cada uno (privilegiado)
    GatewayIntentBits.GuildVoiceStates, // quién está en un canal de voz
  ],
})

let guild = null
let tickTimer = null
let saveTimer = null

// Foto instantánea de los miembros del servidor, en el formato que usa tracker.js
function snapshotGuild(g) {
  const out = []
  for (const m of g.members.cache.values()) {
    if (m.user.bot || cfg.excludeIds.has(m.id)) continue

    const playing = m.presence?.activities?.find((a) => a.type === ActivityType.Playing)
    const voiceChannelId = m.voice?.channelId
    out.push({
      id: m.id,
      name: m.displayName,
      avatar: m.displayAvatarURL({ extension: 'webp', size: 128, forceStatic: true }),
      status: m.presence?.status ?? 'offline',
      game: playing?.name ?? null,
      // el canal AFK no cuenta como estar en voz
      inVoice: Boolean(voiceChannelId) && voiceChannelId !== g.afkChannelId,
    })
  }
  return out
}

function save() {
  try {
    pruneOldDays(store, dayKey(new Date(), cfg.timezone))
    saveStore(store, cfg.dataFile)
  } catch (err) {
    console.error('No pude guardar los datos:', err.message)
  }
}

function startTicking() {
  let last = Date.now()
  tickTimer = setInterval(() => {
    const now = Date.now()
    let dt = (now - last) / 1000
    last = now
    // Si pasó mucho más que un intervalo, la PC estuvo dormida o el bot trabado:
    // no se cuenta ese tiempo.
    if (dt > (cfg.tickMs / 1000) * 3) dt = 0
    applyTick(store, snapshotGuild(guild), dt, new Date(now), cfg)
  }, cfg.tickMs)

  saveTimer = setInterval(save, cfg.saveEveryMs)
}

function shutdown(signal) {
  console.log(`\nRecibí ${signal}, guardando datos y cerrando...`)
  clearInterval(tickTimer)
  clearInterval(saveTimer)
  save()
  server.close()
  client.destroy()
  process.exit(0)
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => shutdown(signal))

const server = startApi({
  port: cfg.port,
  host: cfg.host,
  allowedOrigin: cfg.allowedOrigin,
  getPayload: () => (guild ? buildPublic(store, snapshotGuild(guild), cfg) : null),
})
server.on('listening', () => console.log(`API lista en http://localhost:${cfg.port}/api/members`))
server.on('error', (err) => {
  console.error(
    err.code === 'EADDRINUSE'
      ? `El puerto ${cfg.port} ya está en uso. Cerrá la otra copia del bot o cambiá PORT en .env.`
      : err.message,
  )
  process.exit(1)
})

client.on('error', (err) => console.error('Error de Discord:', err.message))

client.once(Events.ClientReady, async (c) => {
  console.log(`Conectado a Discord como ${c.user.tag}`)

  try {
    guild = await c.guilds.fetch(cfg.guildId)
  } catch {
    console.error('No encuentro el servidor. Revisá GUILD_ID en .env y que el bot esté invitado a ese servidor.')
    process.exit(1)
  }

  // Trae a todos los miembros con su presencia para poder contar desde el primer momento
  await guild.members
    .fetch({ withPresences: true })
    .catch((err) => console.warn('No pude cargar todos los miembros:', err.message))

  console.log(`Servidor: ${guild.name} (${guild.memberCount} miembros). Empezando a contar.`)
  startTicking()
})

client.login(cfg.token).catch((err) => {
  console.error(`\nNo pude conectar con Discord: ${err.message}`)
  if (/intent/i.test(err.message)) {
    console.error('Activá "Presence Intent" y "Server Members Intent" en el Portal de Desarrolladores (Bot > Privileged Gateway Intents).')
  } else if (/token/i.test(err.message)) {
    console.error('Revisá DISCORD_TOKEN en el archivo .env.')
  }
  process.exit(1)
})
