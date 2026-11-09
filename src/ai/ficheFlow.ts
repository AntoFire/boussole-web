import { callAi } from './client'
import { AiError } from './errors'
import { groupBatches, pageRange, type Chunk } from './chunk'
import type { AiRequest, Fiche } from './types'

/** Au-delà, le cours est trop long pour une seule fiche (chaque lot est un appel du quota quotidien). */
export const MAX_BATCHES = 12

export interface FichePart {
  pages: string
  fiche: Fiche
}
type FicheRequest = Extract<AiRequest, { task: 'fiche' }>
export type CallFiche = (req: FicheRequest) => Promise<{ fiche: Fiche; model: string }>

const defaultCall: CallFiche = async (req) => {
  const r = await callAi<'fiche'>(req)
  return { fiche: r.fiche, model: r.model }
}
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Génère la fiche d'un cours, un lot de pages après l'autre, dans l'ordre. */
export async function generateFiche(o: {
  course: string
  chapter: string
  chunks: Chunk[]
  onProgress?: (done: number, total: number) => void
  call?: CallFiche
  sleep?: (ms: number) => Promise<void>
}): Promise<{ parts: FichePart[]; model: string }> {
  const call = o.call ?? defaultCall
  const sleep = o.sleep ?? wait
  const batches = groupBatches(o.chunks)
  if (!batches.length) throw new AiError('invalid', 'Aucun texte à résumer dans ce cours.')
  if (batches.length > MAX_BATCHES)
    throw new AiError('invalid', `Ce cours est trop long pour une seule fiche (${batches.length} parties, maximum ${MAX_BATCHES}). Importe-le en plusieurs PDF.`)
  const parts: FichePart[] = []
  let model = ''
  o.onProgress?.(0, batches.length)
  for (const b of batches) {
    const req: FicheRequest = { task: 'fiche', course: o.course, chapter: o.chapter, text: b.map((c) => c.text).join('\n\n') }
    for (let attempt = 0; ; attempt++) {
      try {
        const r = await call(req)
        parts.push({ pages: pageRange(b), fiche: r.fiche })
        model = r.model
        break
      } catch (e) {
        // trop de demandes à la minute : on patiente un peu, deux fois au plus
        if (e instanceof AiError && e.kind === 'rate' && attempt < 2) await sleep(20_000)
        else throw e
      }
    }
    o.onProgress?.(parts.length, batches.length)
  }
  return { parts, model }
}

/** Idées essentielles de toutes les parties, sans doublon, pour alimenter les « points clés » du chapitre. */
export function ficheKeyPoints(parts: FichePart[], max = 15): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts)
    for (const s of p.fiche.sections)
      for (const k of s.keyPoints) {
        const key = k.trim().toLowerCase()
        if (key && !seen.has(key) && out.length < max) {
          seen.add(key)
          out.push(k.trim())
        }
      }
  return out
}
