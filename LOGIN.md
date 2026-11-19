# Iniciar sesión con Discord (fase 1)

Qué hace: botón "Iniciar sesión" en el menú; al entrar, tu foto reemplaza a "Unirme" con un menú
(Mi perfil / Quitar mis conexiones / Cerrar sesión). Tus conexiones públicas de Discord (Steam, Spotify…)
aparecen como chips en tu ficha. Solo pueden entrar miembros del servidor.

Pedimos solo los permisos `identify` y `connections`. Nunca se guarda el token de Discord.
Se guardan únicamente las conexiones que ya son públicas y están verificadas en Discord.

## 1. Discord Developer Portal
1. https://discord.com/developers/applications → tu aplicación (la del bot).
2. **OAuth2** → **Redirects** → agregá: `https://TU-WORKER.workers.dev/auth/callback` (la dirección de tu Worker) y guardá.
3. Copiá el **Application ID** (General Information) y el **Client Secret** (OAuth2 → Reset Secret).

## 2. Worker (carpeta `worker`)
En `wrangler.jsonc` completá:
- `DISCORD_CLIENT_ID` → el Application ID
- `SITE_URL` → la dirección de tu página, sin barra final (ej. `https://gaming-zone.pages.dev`)

Después, en PowerShell dentro de `worker`:

```
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

`SESSION_SECRET` es una clave inventada por vos (largo, al azar; ej. 40 caracteres). Si algún día la cambiás, todos tienen que volver a iniciar sesión.

## 3. Página
`npm run build` y subí `dist` como siempre.

## Notas
- La sesión dura 30 días en ese navegador. "Cerrar sesión" la borra.
- "Quitar mis conexiones" borra tus conexiones guardadas; se vuelven a guardar la próxima vez que inicies sesión.
- Las conexiones se actualizan cada vez que alguien inicia sesión (no se actualizan solas).
- El bot ya tiene que estar publicando datos: el Worker confirma que sos miembro con esa lista.
