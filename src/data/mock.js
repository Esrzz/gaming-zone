// Datos de ejemplo. Más adelante los va a reemplazar el bot que cuenta las horas.
//
// Forma de cada miembro:
//   hours    -> horas totales conectado al Discord
//   status   -> 'online' | 'idle' | 'dnd' | 'offline'
//   activity -> { verb, name } o null (lo que muestra Discord: "Jugando a ...")
//   week     -> horas de los últimos 7 días
//   streak   -> días seguidos conectándose
//   games    -> horas por juego
//   hue      -> color del avatar provisorio (0-360)

export const MEMBERS = [
  {
    id: 1, name: 'Nox', hours: 486, status: 'online', hue: 268,
    activity: { verb: 'Jugando a', name: 'Hunt: Showdown 1896' },
    week: 31, streak: 14,
    games: { 'Hunt: Showdown 1896': 312, Valorant: 64, 'Rocket League': 22 },
  },
  {
    id: 2, name: 'Kira', hours: 441, status: 'online', hue: 322,
    activity: { verb: 'Jugando a', name: 'Valorant' },
    week: 27, streak: 21,
    games: { Valorant: 268, 'Hunt: Showdown 1896': 71, Minecraft: 40 },
  },
  {
    id: 3, name: 'Zeta', hours: 398, status: 'dnd', hue: 198,
    activity: { verb: 'Jugando a', name: 'Counter-Strike 2' },
    week: 22, streak: 9,
    games: { 'Counter-Strike 2': 251, 'Hunt: Showdown 1896': 54, 'Apex Legends': 33 },
  },
  {
    id: 4, name: 'Rusty', hours: 352, status: 'online', hue: 24,
    activity: { verb: 'Jugando a', name: 'Hunt: Showdown 1896' },
    week: 29, streak: 6,
    games: { 'Hunt: Showdown 1896': 289, 'Helldivers 2': 31 },
  },
  {
    id: 5, name: 'Valkyr', hours: 310, status: 'idle', hue: 290,
    activity: null,
    week: 12, streak: 4,
    games: { 'Apex Legends': 166, Valorant: 80, 'Rocket League': 34 },
  },
  {
    id: 6, name: 'Mauro', hours: 287, status: 'online', hue: 160,
    activity: { verb: 'Jugando a', name: 'Helldivers 2' },
    week: 18, streak: 11,
    games: { 'Helldivers 2': 174, 'Counter-Strike 2': 66, Minecraft: 20 },
  },
  {
    id: 7, name: 'Lunatic', hours: 241, status: 'offline', hue: 240,
    activity: null,
    week: 9, streak: 3,
    games: { Minecraft: 142, 'Rocket League': 60 },
  },
  {
    id: 8, name: 'Tano', hours: 203, status: 'online', hue: 45,
    activity: { verb: 'Jugando a', name: 'Rocket League' },
    week: 14, streak: 5,
    games: { 'Rocket League': 121, 'Counter-Strike 2': 48 },
  },
  {
    id: 9, name: 'Pibe', hours: 176, status: 'offline', hue: 340,
    activity: null,
    week: 4, streak: 2,
    games: { Valorant: 97, 'Apex Legends': 51 },
  },
  {
    id: 10, name: 'Sombra', hours: 138, status: 'idle', hue: 210,
    activity: null,
    week: 7, streak: 7,
    games: { Minecraft: 74, 'Hunt: Showdown 1896': 38 },
  },
]
