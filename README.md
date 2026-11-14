# Gaming Zone

Landing del Discord Gaming Zone. React + Vite, fondo aurora reactivo al mouse, ranking de miembros por horas y tops desplegables.

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
| Miembros, horas, actividad y juegos (datos de ejemplo) | `src/data/mock.js` |
| Colores, tipografías, tamaños, animaciones | `src/styles.css` (variables al inicio) |
| Fondo aurora y estela del mouse | `src/components/AuroraBackground.jsx` |
| Imágenes y logo | `public/` (`mascot.webp`, `logo-sm.webp`, `favicon.png`, `og.jpg`) |

El link de invitación (`invite` en `src/config.js`) está con un valor de relleno: reemplazalo por el real.

## Cuando llegue el bot

Los tops se calculan a partir de la lista de miembros, así que alcanza con que el bot entregue
los datos con la misma forma que `src/data/mock.js` (por ejemplo, un JSON publicado en alguna URL)
y que `App.jsx` los pida en lugar de importar `MEMBERS`.
