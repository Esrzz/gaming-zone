import fs from 'node:fs'
import path from 'node:path'

// Los datos viven en un archivo JSON (sin base de datos que instalar).
// Es chico: unos pocos KB para 40 personas.

export function emptyStore() {
  return { version: 1, members: {}, gameApps: {}, gameIcons: {} }
}

export function loadStore(file) {
  let raw
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') return emptyStore()
    throw err
  }
  try {
    const data = JSON.parse(raw)
    return {
      version: 1,
      members: data.members ?? {},
      gameApps: data.gameApps ?? {},
      gameIcons: data.gameIcons ?? {},
    }
  } catch {
    // No lo pisamos en silencio: sería perder todo el historial.
    throw new Error(
      `El archivo de datos está dañado: ${file}\n` +
        'No lo borres todavía. Probá reemplazarlo por la copia stats.json.bak de la misma carpeta.\n' +
        'Si querés empezar de cero, borralo a mano.',
    )
  }
}

// Escritura atómica: primero a un temporal y después se renombra,
// así un corte de luz a mitad de guardado no deja el archivo roto.
export function saveStore(store, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(store))
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`)
  fs.renameSync(tmp, file)
}
