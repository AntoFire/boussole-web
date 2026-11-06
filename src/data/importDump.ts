import { KNOWN_COLLECTIONS, type Dump } from './store'

/** Ce que l'import va écrire, après vérification du fichier. */
export interface ImportPlan {
  dump: Dump
  counts: Record<string, number>
  total: number
  /** documents ou collections laissés de côté, avec la raison */
  skipped: string[]
  /** date de l'export, si le fichier la donne */
  exportedAt: string | null
}

/** Limite Firestore : 1 Mio par document (on garde une marge). */
export const MAX_DOC_BYTES = 900_000

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length
const KNOWN = new Set<string>(KNOWN_COLLECTIONS)

/** Firestore refuse les tableaux directement dans des tableaux. */
export function hasNestedArray(v: unknown, inArray = false): boolean {
  if (Array.isArray(v)) return inArray || v.some((x) => hasNestedArray(x, true))
  if (isObj(v)) return Object.values(v).some((x) => hasNestedArray(x, false))
  return false
}

function validId(id: string) {
  return id.length > 0 && id.length <= 700 && !id.includes('/') && id !== '.' && id !== '..' && !/^__.*__$/.test(id)
}

/** Ramène une collection à la forme {id: document}, quel que soit le format d'origine. */
function toMap(name: string, docs: unknown, skipped: string[]): Record<string, unknown> | null {
  // ancien export de l'artifact : tableau de documents portant leur id
  if (Array.isArray(docs)) {
    const m: Record<string, unknown> = {}
    docs.forEach((d, i) => {
      if (isObj(d) && typeof d.id === 'string' && d.id) {
        const { id, ...rest } = d
        m[id] = rest
      } else skipped.push(`${name} n° ${i + 1} : pas d'identifiant`)
    })
    return m
  }
  if (!isObj(docs)) return null
  // ancien export : journal {mois: [entrées]}
  if (name === 'journal') return Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, Array.isArray(v) ? { entries: v } : v]))
  return docs
}

/**
 * Vérifie un fichier d'export et prépare l'import.
 * Accepte l'export complet de l'artifact ({_meta, collection: {id: doc}}), l'export de l'appli
 * et l'ancien export partiel de l'artifact (concepts et evals en tableaux).
 */
export function planImport(raw: unknown): ImportPlan {
  if (!isObj(raw)) throw new Error('le fichier ne contient pas un objet JSON')
  const dump: Dump = {}
  const counts: Record<string, number> = {}
  const skipped: string[] = []
  for (const [name, docs] of Object.entries(raw)) {
    if (name.startsWith('_')) continue
    const map = toMap(name, docs, skipped)
    if (!map) continue // métadonnées (app, version, exportedAt…)
    if (!KNOWN.has(name)) {
      skipped.push(`collection « ${name} » inconnue de l'appli`)
      continue
    }
    for (const [id, d] of Object.entries(map)) {
      const why = !validId(id)
        ? 'identifiant invalide'
        : !isObj(d)
          ? 'pas un document'
          : hasNestedArray(d)
            ? 'tableau dans un tableau (refusé par Firestore)'
            : bytes(d) > MAX_DOC_BYTES
              ? 'document trop gros'
              : null
      if (why) {
        skipped.push(`${name}/${id} : ${why}`)
        continue
      }
      ;(dump[name] ??= {})[id] = d
      counts[name] = (counts[name] ?? 0) + 1
    }
  }
  const total = Object.values(counts).reduce((a, n) => a + n, 0)
  if (!total) throw new Error('aucun document Boussole dans ce fichier')
  const meta = isObj(raw._meta) ? raw._meta : raw
  return { dump, counts, total, skipped, exportedAt: typeof meta.exportedAt === 'string' ? meta.exportedAt : null }
}

export interface Write {
  name: string
  id: string
  data: unknown
}

/** Découpe les écritures en lots Firestore : au plus `maxN` écritures et environ `maxBytes` par lot. */
export function chunkWrites(dump: Dump, maxN = 400, maxBytes = 4_000_000): Write[][] {
  const out: Write[][] = []
  let cur: Write[] = []
  let size = 0
  for (const [name, docs] of Object.entries(dump)) {
    for (const [id, data] of Object.entries(docs)) {
      const b = bytes(data)
      if (cur.length && (cur.length >= maxN || size + b > maxBytes)) {
        out.push(cur)
        cur = []
        size = 0
      }
      cur.push({ name, id, data })
      size += b
    }
  }
  if (cur.length) out.push(cur)
  return out
}
