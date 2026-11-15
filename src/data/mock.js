// Datos de ejemplo. Se usan cuando el bot no está conectado.
// Tienen la misma forma que entrega el bot (ver bot/src/tracker.js, buildPublic).
//
//   hours       -> horas en canales de voz
//   inVoice     -> está ahora en un canal de voz
//   status      -> 'online' | 'idle' | 'dnd' | 'offline'
//   activity    -> { verb, name } o null (lo que muestra Discord: "Jugando a ...")
//   week        -> horas en voz de los últimos 7 días
//   streak      -> días seguidos entrando a voz
//   games       -> horas por juego, jugadas en voz
//   rancho      -> horas jugadas SIN estar en voz ("Rancho aparte")
//   ranchoGames -> esas horas, por juego
//   avatar      -> URL de la foto (null = se muestra la inicial)
//   hue         -> color de la inicial cuando no hay foto (0-360)

export const MEMBERS = [
  {
    id: '1', name: 'Nox', hours: 486, status: 'online', inVoice: true, hue: 268, avatar: null,
    activity: { verb: 'Jugando a', name: 'Hunt: Showdown 1896' },
    week: 31, streak: 14,
    games: { 'Hunt: Showdown 1896': 312, Valorant: 64, 'Rocket League': 22 },
    rancho: 38, ranchoGames: { 'Hunt: Showdown 1896': 38 },
  },
  {
    id: '2', name: 'Kira', hours: 441, status: 'online', inVoice: true, hue: 322, avatar: null,
    activity: { verb: 'Jugando a', name: 'Valorant' },
    week: 27, streak: 21,
    games: { Valorant: 268, 'Hunt: Showdown 1896': 71, Minecraft: 40 },
    rancho: 12, ranchoGames: { Valorant: 12 },
  },
  {
    id: '3', name: 'Zeta', hours: 398, status: 'dnd', inVoice: true, hue: 198, avatar: null,
    activity: { verb: 'Jugando a', name: 'Counter-Strike 2' },
    week: 22, streak: 9,
    games: { 'Counter-Strike 2': 251, 'Hunt: Showdown 1896': 54, 'Apex Legends': 33 },
    rancho: 55, ranchoGames: { 'Counter-Strike 2': 55 },
  },
  {
    id: '4', name: 'Rusty', hours: 352, status: 'online', inVoice: true, hue: 24, avatar: null,
    activity: { verb: 'Jugando a', name: 'Hunt: Showdown 1896' },
    week: 29, streak: 6,
    games: { 'Hunt: Showdown 1896': 289, 'Helldivers 2': 31 },
    rancho: 9, ranchoGames: { 'Hunt: Showdown 1896': 9 },
  },
  {
    id: '5', name: 'Valkyr', hours: 310, status: 'idle', inVoice: false, hue: 290, avatar: null,
    activity: null,
    week: 12, streak: 4,
    games: { 'Apex Legends': 166, Valorant: 80, 'Rocket League': 34 },
    rancho: 61, ranchoGames: { 'Apex Legends': 61 },
  },
  {
    id: '6', name: 'Mauro', hours: 287, status: 'online', inVoice: false, hue: 160, avatar: null,
    activity: { verb: 'Jugando a', name: 'Helldivers 2' },
    week: 18, streak: 11,
    games: { 'Helldivers 2': 174, 'Counter-Strike 2': 66, Minecraft: 20 },
    rancho: 47, ranchoGames: { 'Helldivers 2': 47 },
  },
  {
    id: '7', name: 'Lunatic', hours: 241, status: 'offline', inVoice: false, hue: 240, avatar: null,
    activity: null,
    week: 9, streak: 3,
    games: { Minecraft: 142, 'Rocket League': 60 },
    rancho: 88, ranchoGames: { Minecraft: 88 },
  },
  {
    id: '8', name: 'Tano', hours: 203, status: 'online', inVoice: false, hue: 45, avatar: null,
    activity: { verb: 'Jugando a', name: 'Rocket League' },
    week: 14, streak: 5,
    games: { 'Rocket League': 121, 'Counter-Strike 2': 48 },
    rancho: 15, ranchoGames: { 'Rocket League': 15 },
  },
  {
    id: '9', name: 'Pibe', hours: 176, status: 'offline', inVoice: false, hue: 340, avatar: null,
    activity: null,
    week: 4, streak: 2,
    games: { Valorant: 97, 'Apex Legends': 51 },
    rancho: 72, ranchoGames: { Valorant: 72 },
  },
  {
    id: '10', name: 'Sombra', hours: 138, status: 'idle', inVoice: false, hue: 210, avatar: null,
    activity: null,
    week: 7, streak: 7,
    games: { Minecraft: 74, 'Hunt: Showdown 1896': 38 },
    rancho: 26, ranchoGames: { Minecraft: 26 },
  },
]
