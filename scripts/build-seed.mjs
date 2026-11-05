// Assemble seed/raw/<collection>/<id>.json en public/seed.json ({collection:{id:doc}}).
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../', import.meta.url).pathname
const raw = join(root, 'seed/raw')
if (!existsSync(raw)) {
  console.error('seed/raw introuvable : exporte d’abord les données de l’artifact.')
  process.exit(1)
}
const out = {}
for (const col of readdirSync(raw)) {
  const dir = join(raw, col)
  if (!statSync(dir).isDirectory()) continue
  out[col] = {}
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue
    out[col][f.slice(0, -5)] = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  }
}
writeFileSync(join(root, 'public/seed.json'), JSON.stringify(out))
const counts = Object.entries(out).map(([k, v]) => `${k}: ${Object.keys(v).length}`)
console.log('public/seed.json écrit —', counts.join(', '))
