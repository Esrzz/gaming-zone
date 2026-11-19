// Dirección del Worker. En desarrollo (npm run dev) busca el bot en tu propia PC.
// Publicada, usa VITE_API_URL, que se define al compilar (ver PUBLICAR.md).
export const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : 'https://gaming-zone-api.gamingzone.workers.dev')
