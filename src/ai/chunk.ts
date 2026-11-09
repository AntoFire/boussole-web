/** Texte d'une page de PDF, déjà extrait. */
export interface PageText {
  n: number
  text: string
}

/** Morceau de cours : pages consécutives, texte avec marqueurs « [p. N] ». */
export interface Chunk {
  n: number
  p1: number
  p2: number
  text: string
}

/** Taille d'un morceau stocké (et plus tard retrouvé par le tuteur). */
export const CHUNK_CHARS = 10_000
/** Taille maximale du texte envoyé au modèle en un appel. */
export const BATCH_CHARS = 20_000
/** En dessous, le PDF est considéré comme sans texte exploitable. */
export const MIN_TEXT_CHARS = 200
const EMPTY_PAGE = 20

/** Nettoie le texte brut d'une page : mots coupés en fin de ligne recollés, espaces et lignes vides repliés. */
export function cleanPageText(raw: string): string {
  return raw
    .replace(/(\p{L})-\n(?=\p{Ll})/gu, '$1')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface Analysis {
  chars: number
  emptyPages: number
  /** vrai si le PDF n'a (presque) pas de texte : scan ou images, il faudrait de l'OCR */
  scanned: boolean
}

export function analyze(numPages: number, pages: PageText[]): Analysis {
  const chars = pages.reduce((n, p) => n + p.text.length, 0)
  const withText = pages.filter((p) => p.text.length >= EMPTY_PAGE).length
  const emptyPages = Math.max(0, numPages - withText)
  return { chars, emptyPages, scanned: chars < MIN_TEXT_CHARS || (numPages > 0 && emptyPages / numPages >= 0.8) }
}

/** Découpe un texte trop long : par paragraphes, puis par lignes, puis au couteau. */
function splitLong(text: string, max: number): string[] {
  if (text.length <= max) return [text]
  const out: string[] = []
  let cur = ''
  const push = (s: string, sep: string) => {
    if (cur && cur.length + sep.length + s.length > max) {
      out.push(cur)
      cur = ''
    }
    cur = cur ? cur + sep + s : s
  }
  for (const para of text.split('\n\n')) {
    if (para.length <= max) push(para, '\n\n')
    else
      for (const line of para.split('\n'))
        if (line.length <= max) push(line, '\n')
        else for (let i = 0; i < line.length; i += max) push(line.slice(i, i + max), '\n')
  }
  if (cur) out.push(cur)
  return out
}

/** Découpe le cours en morceaux ≤ `max` caractères, dans l'ordre des pages. */
export function buildChunks(pages: PageText[], max = CHUNK_CHARS): Chunk[] {
  const chunks: Chunk[] = []
  let cur: { p1: number; p2: number; text: string } | null = null
  const flush = () => {
    if (cur) chunks.push({ n: chunks.length + 1, ...cur })
    cur = null
  }
  for (const p of pages) {
    if (!p.text.trim()) continue
    const marker = `[p. ${p.n}]\n`
    for (const piece of splitLong(p.text, max - marker.length - 2)) {
      const block = marker + piece
      if (cur && cur.text.length + 2 + block.length > max) flush()
      if (cur) {
        cur.text += '\n\n' + block
        cur.p2 = p.n
      } else cur = { p1: p.n, p2: p.n, text: block }
    }
  }
  flush()
  return chunks
}

/** Regroupe des morceaux consécutifs en lots d'au plus `max` caractères (un lot = un appel au modèle). */
export function groupBatches(chunks: Chunk[], max = BATCH_CHARS): Chunk[][] {
  const batches: Chunk[][] = []
  let cur: Chunk[] = []
  let size = 0
  for (const c of chunks) {
    if (cur.length && size + c.text.length > max) {
      batches.push(cur)
      cur = []
      size = 0
    }
    cur.push(c)
    size += c.text.length
  }
  if (cur.length) batches.push(cur)
  return batches
}

/** Pages couvertes par des morceaux : « 4-9 » ou « 7 ». */
export function pageRange(chunks: Chunk[]): string {
  if (!chunks.length) return ''
  const a = Math.min(...chunks.map((c) => c.p1))
  const b = Math.max(...chunks.map((c) => c.p2))
  return a === b ? String(a) : `${a}-${b}`
}
