# Bot de Gaming Zone

Cuenta cuánto tiempo pasa cada uno en los canales de voz y a qué juega, y entrega esos datos a la página.

## Qué cuenta

| Situación | Dónde se suma |
|---|---|
| En un canal de voz | Ranking principal (horas en voz), y las horas de ese juego si está jugando |
| Jugando **sin** estar en un canal de voz | Top **Rancho aparte** (se muestra último) |
| Conectado pero sin jugar ni estar en voz | No suma |

- El canal AFK del servidor no cuenta como estar en voz.
- Si la PC se duerme o el bot se traba, ese tiempo no se cuenta.
- Para que sume en voz **solo cuando además está jugando**, poné `COUNT_VOICE_ONLY_WHEN_PLAYING=true` en `.env`.

## 1. Crear el bot en Discord

1. Entrá a <https://discord.com/developers/applications> y tocá **New Application**. Ponele un nombre (por ejemplo "Gaming Zone Stats").
2. En el menú **Bot**, tocá **Reset Token** y copiá el token. Se muestra una sola vez y es como una contraseña: no lo compartas ni lo subas a ningún lado.
3. En esa misma pantalla, bajá a **Privileged Gateway Intents** y activá **Presence Intent** y **Server Members Intent**. Guardá los cambios. Sin la primera no se puede ver a qué juega cada uno.
4. En **OAuth2 > URL Generator**, marcá el scope **bot** y, en los permisos del bot, **View Channels**. Copiá la URL de abajo, abrila en el navegador y elegí tu servidor.
5. En Discord, activá el modo desarrollador (Ajustes de usuario > Avanzado > Modo desarrollador). Después hacé clic derecho en el ícono del servidor y elegí **Copiar ID del servidor**.

## 2. Configurarlo y encenderlo

Desde una terminal, dentro de esta carpeta (`bot`):

```bash
npm install
```

Copiá `.env.example` como `.env` (en Windows: `copy .env.example .env`) y completá `DISCORD_TOKEN` y `GUILD_ID`.

```bash
npm start
```

Si todo está bien, vas a ver algo así:

```
API lista en http://localhost:3001/api/members
Conectado a Discord como Gaming Zone Stats#1234
Servidor: Gaming Zone (40 miembros). Empezando a contar.
```

Para ver lo que está registrando, abrí <http://localhost:3001/api/members> en el navegador. Al principio va a estar vacío: aparecen los que entren a un canal de voz o empiecen a jugar.

## 3. Ver la página con datos reales

Con el bot encendido, en **otra terminal** y en la carpeta principal del proyecto:

```bash
npm run dev
```

En modo desarrollo la página busca los datos en `http://localhost:3001` sola. Si el bot está apagado, muestra los datos de ejemplo y lo avisa con una etiqueta junto al título del ranking.

## Opciones (`.env`)

| Variable | Para qué sirve |
|---|---|
| `DISCORD_TOKEN`, `GUILD_ID` | Obligatorias |
| `PORT` | Puerto de la API (3001 por defecto) |
| `TIMEZONE` | Define cuándo empieza cada día para la racha y la semana |
| `EXCLUDE_IDS` | IDs de personas que no querés que aparezcan, separados por coma |
| `COUNT_VOICE_ONLY_WHEN_PLAYING` | `true` = en voz solo suma si además juega |
| `STREAK_MIN_MINUTES` | Minutos mínimos en voz por día para sumar a la racha |
| `ALLOWED_ORIGIN` | Qué páginas pueden leer los datos (`*` = cualquiera) |
| `PUSH_URL`, `PUSH_TOKEN` | Para publicar los datos en la nube (ver `PUBLICAR.md`). Si están vacías, el bot solo sirve los datos en tu PC |
| `PUSH_EVERY_SECONDS` | Cada cuánto publica en la nube (120 por defecto, mínimo 90) |

## Fichas de miembros

Para la ficha de cada persona el bot además guarda:

- **Sesiones en voz:** cada vez que alguien entra y sale de un canal de voz (se guardan las últimas 20 por persona, y se parte una sesión si pasan más de 5 minutos sin registrarse).
- **Tiempo compartido:** cuánto tiempo estuvo cada par de personas en el mismo canal de voz a la vez.

Esto empieza a juntarse desde que arrancás esta versión; no se puede reconstruir el pasado. Las horas anteriores se conservan.

## Íconos de los juegos

Cuando alguien juega, Discord le informa al bot el ID del juego, y con ese ID el bot busca el ícono oficial (en el CDN de Discord) y lo manda junto con los datos. No hay que configurar nada.

- Los íconos aparecen a medida que alguien juega cada juego por primera vez (puede tardar unos minutos).
- Si Discord no conoce el juego o no tiene ícono, la página muestra la inicial del juego sobre un color.
- Para poner uno a mano, mirá `src/data/gameIcons.js` en la carpeta principal del proyecto.

## Pasarlo a la Raspberry Pi

1. Instalá Node.js 18 o superior en la Raspberry.
2. Copiá la carpeta `bot` **sin** `node_modules`. Para conservar el historial, copiá también `data/stats.json`, y llevate el archivo `.env`.
3. En la Raspberry, dentro de la carpeta: `npm install` y `npm start` para probar.
4. Para que arranque solo y se reinicie si falla, podés usar pm2:
   ```bash
   sudo npm install -g pm2
   pm2 start src/index.js --name gaming-zone-bot
   pm2 save
   pm2 startup
   ```
   (`pm2 startup` te muestra un comando para copiar y pegar.)

Los datos se guardan en el disco cada 5 minutos y al cerrar el bot de forma normal, para no gastar de más la tarjeta SD. Si se corta la luz, lo máximo que se pierde son esos últimos 5 minutos.

## Datos y privacidad

- Todo queda en `data/stats.json` (más una copia `stats.json.bak`). Para empezar de cero, borrá esos archivos con el bot apagado.
- Se guardan y publican en la página nombres, fotos de perfil, horas y juegos. Conviene avisarle al grupo, y quien no quiera aparecer se puede agregar a `EXCLUDE_IDS`.
- La API solo entrega datos de lectura. Nunca expone el token.
- Si sospechás que el token se filtró, generá uno nuevo con **Reset Token**.

## Para publicar la página

Cuando la página esté en internet no puede leer directamente el bot que corre en tu casa. Por eso el bot puede publicar los datos en un Worker gratuito de Cloudflare (variables `PUSH_URL` y `PUSH_TOKEN` del `.env`) y la página los lee de ahí. La guía paso a paso está en `PUBLICAR.md`, en la carpeta principal del proyecto.
