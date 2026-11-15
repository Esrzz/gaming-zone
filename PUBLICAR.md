# Publicar Gaming Zone gratis

Con esta guía la página queda en internet, con una dirección gratuita de Cloudflare, y sigue mostrando los datos del bot.

## Cómo queda armado

```
Tu PC o Raspberry                Cloudflare (gratis)                        Visitantes
┌────────────────┐   envía     ┌───────────────────────┐   lee    ┌─────────────────────────┐
│ Bot de Discord │ ──────────▶ │ Worker                │ ◀─────── │ Página (…pages.dev)     │
└────────────────┘  los datos  │ (…workers.dev)        │          └─────────────────────────┘
                               └───────────────────────┘
```

La página publicada no puede leer el bot que corre en tu casa: tu PC no es accesible desde internet. Por eso el bot **envía** los datos a un pequeño servicio en Cloudflare (el Worker) y la página los **lee** de ahí. Ventajas: no abrís puertos en el router, funciona igual desde la PC o desde la Raspberry, y si el bot se apaga la página lo avisa.

Las dos direcciones son gratuitas y las elegís vos:
- Worker: `gaming-zone-api.TU-SUBDOMINIO.workers.dev`
- Página: `NOMBRE-DEL-PROYECTO.pages.dev`

## Antes de empezar

- Una cuenta gratuita de Cloudflare: <https://dash.cloudflare.com/sign-up>
- Node.js instalado (ya lo tenés) y el bot funcionando en tu PC.

## Paso 1: crear el Worker

Abrí una terminal en la carpeta `worker` del proyecto y ejecutá, uno por uno:

```bash
npm install
npx wrangler login
```
El segundo comando abre el navegador para que autorices a Wrangler (la herramienta de Cloudflare) con tu cuenta.

```bash
npx wrangler kv namespace create STATS
```
Esto crea el lugar donde se guardan los datos y muestra un fragmento con un `id`. Copiá ese `id`, abrí `worker/wrangler.jsonc` y reemplazá `PEGAR_ACA_EL_ID` por él.

```bash
npx wrangler deploy
```
Publica el Worker. La primera vez puede pedirte que elijas un subdominio `workers.dev`. Al terminar muestra la dirección, algo como `https://gaming-zone-api.TU-SUBDOMINIO.workers.dev`. **Anotala.**

Ahora la contraseña que el bot usa para enviar datos (solo el bot debe conocerla). Para generar una larga y aleatoria:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```
Copiá el resultado y cargalo en Cloudflare (te lo va a pedir sin mostrarlo mientras lo pegás):

```bash
npx wrangler secret put PUSH_TOKEN
```

**Para comprobar:** abrí en el navegador `https://gaming-zone-api.TU-SUBDOMINIO.workers.dev/api/members`. Todavía debería decir `Todavía no llegaron datos del bot`. Es lo esperado.

## Paso 2: conectar el bot

En `bot/.env` completá estas dos líneas con tus valores:

```
PUSH_URL=https://gaming-zone-api.TU-SUBDOMINIO.workers.dev/api/push
PUSH_TOKEN=la-misma-contraseña-del-paso-anterior
```

`PUSH_URL` termina en `/api/push`. Reiniciá el bot (`Ctrl + C` y `npm start`). Tiene que aparecer:

```
Publicando los datos en https://.../api/push cada 120 segundos.
```

Esperá un momento y volvé a abrir `.../api/members` en el navegador: ahora debería mostrar los datos.

## Paso 3: publicar la página

1. **Link de invitación.** Abrí `src/config.js` y reemplazá `https://discord.gg/TU-INVITE` por el link de invitación real de tu servidor. Para que no se venza, en Discord creá la invitación (clic derecho en un canal > Invitar gente) y en la configuración del link elegí que **nunca expire**.
2. **Dirección del Worker.** En la carpeta principal del proyecto, copiá `.env.production.example` como `.env.production` (en Windows: `copy .env.production.example .env.production`) y editalo con la dirección de tu Worker, **sin** `/api/members` al final.
3. **Compilar.** En la carpeta principal ejecutá:
   ```bash
   npm run build
   ```
   Se crea la carpeta `dist`, que es la página lista para publicar.
4. **Subirla a Cloudflare Pages.** En el panel de Cloudflare entrá a **Workers & Pages**, elegí **Create application**, después **Get started** y la opción **Drag and drop your files**. Poné un nombre de proyecto (ese será `NOMBRE.pages.dev`), arrastrá la carpeta `dist` y confirmá con **Deploy site** / **Save and Deploy**. Si el nombre está ocupado, probá con otro. (Cloudflare cambia el panel de vez en cuando, así que los nombres de los botones pueden variar un poco.)

## Paso 4: probarlo

Abrí `https://NOMBRE.pages.dev`. Al lado del título del ranking tiene que decir **En vivo**.

## Para actualizar la página más adelante

Hacés los cambios, ejecutás de nuevo `npm run build` y subís la carpeta `dist` como una nueva implementación en tu proyecto de Pages. El bot y el Worker no hace falta tocarlos.

## Cuando pases el bot a la Raspberry

Copiás la carpeta `bot` con su `.env` (que ya incluye `PUSH_URL` y `PUSH_TOKEN`) y listo: sigue publicando al mismo Worker. No se cambia nada de Cloudflare.

## Opcional: que solo tu página pueda leer los datos

En `worker/wrangler.jsonc`, cambiá `"ALLOWED_ORIGIN": "*"` por la dirección de tu página, por ejemplo `"https://NOMBRE.pages.dev"` (con `https://` y sin barra al final), y ejecutá de nuevo `npx wrangler deploy` dentro de `worker`.

## Límites del plan gratuito

- Cloudflare KV (donde el Worker guarda los datos): **1.000 escrituras y 100.000 lecturas por día** ([documentación](https://developers.cloudflare.com/kv/platform/pricing)).
- El bot escribe una vez cada 2 minutos como máximo (unas 720 por día) y se saltea el envío si no cambió nada. Por eso `PUSH_EVERY_SECONDS` no acepta menos de 90.
- La página consulta una vez por minuto y solo con la pestaña visible, así que el uso de lecturas es muy bajo.
- Subida de la página por arrastrar y soltar: hasta 1.000 archivos y 25 MiB por archivo ([documentación](https://developers.cloudflare.com/pages/get-started/direct-upload/)). Esta página usa unos pocos archivos livianos.

## Si algo no anda

| Qué ves | Qué pasa y cómo se arregla |
|---|---|
| La página dice **Datos de ejemplo** | No llega al Worker. Revisá que exista `.env.production`, que la dirección esté bien escrita, y volvé a ejecutar `npm run build` y a subir `dist` (el archivo solo se lee al compilar). |
| La página dice **Bot desconectado** | El bot no está corriendo, la PC está dormida o sin internet. Fijate en la terminal del bot si aparece "No pude publicar los datos en la nube". |
| El bot muestra `HTTP 401` | `PUSH_TOKEN` del `.env` no coincide con el del Worker. Volvé a ejecutar `npx wrangler secret put PUSH_TOKEN` con exactamente el mismo valor. |
| `wrangler deploy` da error con KV | Falta reemplazar `PEGAR_ACA_EL_ID` en `worker/wrangler.jsonc`. |
| `.../api/members` dice "Todavía no llegaron datos" | Es normal hasta que el bot publique por primera vez. Revisá que el bot esté encendido y con `PUSH_URL` cargada. |
| Error de CORS en la consola del navegador | Probablemente `ALLOWED_ORIGIN` esté mal: tiene que ser idéntico a la dirección de la página (con `https://` y sin barra final). |
| PowerShell bloquea `npx` | Ejecutá `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, o usá CMD. |

## Más adelante: dominio propio

Las direcciones `pages.dev` y `workers.dev` sirven para siempre. Si algún día querés una propia (como `gamingzone.com`), se compra aparte y se conecta al mismo proyecto de Pages sin rehacer nada.
