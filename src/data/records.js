import { fmtHours } from '../lib/format.js'

// Récords y sus medallas. El bot manda quién tiene cada uno (por id); acá está todo lo visual.
// Para sumar uno nuevo: agregá su definición en bot/src/records.js, la imagen en public/medals/
// y una entrada acá con el mismo id. El orden de esta lista es el orden en que se muestran.

// Horas y minutos, igual que en el resto de la página (ver lib/format.js)
const hours = fmtHours
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export const RECORDS = [
  {
    id: 'gamer',
    title: 'El gamer definitivo',
    short: 'Mayor cantidad de horas aportadas al Discord',
    desc: 'Quien más horas acumuló en los canales de voz desde que el bot empezó a contar. El logro más grande del servidor.',
    image: '/medals/gamer.webp',
    format: hours,
    featured: true,
  },
  {
    id: 'sonambulo',
    title: 'El sonámbulo',
    short: 'Sesión más larga',
    desc: 'La sesión más larga en un canal de voz sin salir. Dormir, comer y respirar son opcionales.',
    image: '/medals/sonambulo.webp',
    format: hours,
  },
  {
    id: 'empleado',
    title: 'El empleado',
    short: 'Mayor racha de días',
    desc: 'La racha más larga de días seguidos entrando a voz. Nunca falta a su turno.',
    image: '/medals/empleado.webp',
    format: (v) => plural(v, 'día seguido', 'días seguidos'),
  },
  {
    id: 'jornada',
    title: 'Jornada laboral',
    short: 'Más horas en 7 días',
    desc: 'La semana más intensa: más horas en voz dentro de una ventana de 7 días.',
    image: '/medals/jornada.webp',
    format: hours,
  },
  {
    id: 'coleccionista',
    title: 'El coleccionista',
    short: 'Más juegos diferentes',
    desc: 'Quien jugó más juegos distintos, dentro y fuera de voz. Prueba de todo.',
    image: '/medals/coleccionista.webp',
    format: (v) => plural(v, 'juego distinto', 'juegos distintos'),
  },
  {
    id: 'otp',
    title: 'OTP',
    short: 'Más horas en un solo juego',
    desc: 'Quien acumuló más horas en un único juego. Fiel hasta el final.',
    image: '/medals/otp.webp',
    format: hours,
  },
  {
    id: 'janeo',
    title: 'Máquina del Janeo',
    short: 'El juego favorito de todos',
    desc: 'El juego con más horas sumadas entre todos los miembros. Acá el dueño del récord es el juego.',
    image: '/medals/janeo.webp',
    format: hours,
  },
  {
    id: 'fantasma',
    title: 'El fantasma',
    short: 'Mayor sesión sin actividad',
    desc: 'El mayor tiempo seguido en un canal de voz sin jugar a nada. Está, pero no está.',
    image: '/medals/fantasma.webp',
    format: hours,
  },
  {
    id: 'vibra',
    title: 'Vibra alta',
    short: 'Mayor tiempo conectado escuchando música',
    desc: 'Quien más tiempo pasó escuchando música en Spotify con Discord abierto.',
    image: '/medals/vibra.webp',
    format: hours,
  },
  {
    id: 'shape',
    title: 'El shapeshifter',
    short: 'Más juegos diferentes en una sola sesión',
    desc: 'La sesión de voz donde se jugaron más juegos distintos (al menos 5 minutos en cada uno).',
    image: '/medals/shape.webp',
    format: (v) => plural(v, 'juego en una sesión', 'juegos en una sesión'),
  },
]

export const RECORD_BY_ID = Object.fromEntries(RECORDS.map((r) => [r.id, r]))
