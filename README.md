# Gaming Zone

Landing del Discord Gaming Zone. React + Vite,Le puse estilos basados en la estetica del dueño del Discord respetando colores e imagenes.

## Correrlo en tu compu

Necesitás [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install
npm run dev
```

Se abre en `http://localhost:5173` y se actualiza solo cuando guardás cambios.

Para generar la versión final (la que se publica): `npm run build`. Queda en `dist/`.

## Dónde cambiar cada cosa

| Qué | Dónde |
|---|---|
| Título, texto de presentación y link de invitación al Discord | `src/config.js` |
| Datos de ejemplo (se muestran solo cuando el bot está apagado) | `src/data/mock.js` |
| El bot que cuenta las horas | carpeta `bot/` (guía en `bot/README.md`) |
| El puente gratuito en Cloudflare para publicar | carpeta `worker/` (guía en `PUBLICAR.md`) |
| Íconos de juegos puestos a mano | `src/data/gameIcons.js` y la carpeta `public/games/` |
| Colores, tipografías, tamaños, animaciones | `src/styles.css` (variables al inicio) |
| Fondo aurora y estela del mouse | `src/components/AuroraBackground.jsx` |
| Imágenes y logo | `public/` (`mascot.webp`, `logo-sm.webp`, `favicon.png`, `og.jpg`) |

El link de invitación (`invite` en `src/config.js`) está con un valor de relleno: reemplazalo por el real.

## El bot

La carpeta `bot/` tiene el bot de Discord que cuenta las horas en voz y las horas jugadas fuera de voz
("Rancho aparte"), y las entrega a la página. La guía paso a paso está en `bot/README.md`.

Con el bot encendido, `npm run dev` muestra los datos reales automáticamente (busca el bot en
`http://localhost:3001`). Con el bot apagado, la página muestra los datos de ejemplo y lo indica con
una etiqueta junto al título del ranking.

## Publicarlo gratis

La guía completa está en **`PUBLICAR.md`**: el bot envía los datos a un Worker gratuito de Cloudflare
(carpeta `worker/`) y la página, publicada en Cloudflare Pages, los lee de ahí. Las direcciones quedan
como `NOMBRE.pages.dev` y `NOMBRE.workers.dev`.
