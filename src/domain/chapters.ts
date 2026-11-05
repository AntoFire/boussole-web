import type { ChaptersCfg, CourseKey, FlashCard, FlashSource } from './types'

export interface ChapterInfo {
  n: number
  label: string
  fiche: string
}

/** Numéro de chapitre d'une carte : le sien, sinon celui de sa source, sinon 1. */
export function chOf(x: { ch?: number; src?: string }, sources: FlashSource[]): number {
  if (typeof x.ch === 'number') return x.ch
  const s = x.src ? sources.find((y) => y.id === x.src) : undefined
  return s && typeof s.ch === 'number' ? s.ch : 1
}

export function chCards(course: CourseKey, n: number, flash: FlashCard[], sources: FlashSource[]): FlashCard[] {
  return flash.filter((c) => !c.flagged && c.course === course && chOf(c, sources) === n)
}

export function chList(course: CourseKey, cfg: ChaptersCfg, flash: FlashCard[], sources: FlashSource[]): ChapterInfo[] {
  const list: ChapterInfo[] = (cfg[course]?.chapters ?? []).map((c) => ({
    n: c.n,
    label: c.label || 'Chapitre ' + c.n,
    fiche: c.fiche ?? '',
  }))
  const seen = new Set(list.map((c) => c.n))
  for (const c of flash) {
    const n = chOf(c, sources)
    if (c.course === course && !seen.has(n)) {
      seen.add(n)
      list.push({ n, label: 'Chapitre ' + n, fiche: '' })
    }
  }
  return list.sort((a, b) => a.n - b.n)
}

export function chLabel(course: CourseKey, n: number, cfg: ChaptersCfg, flash: FlashCard[], sources: FlashSource[]): string {
  if (n === 99) return 'Autres notions'
  return chList(course, cfg, flash, sources).find((c) => c.n === n)?.label ?? 'Chapitre ' + n
}

/** Chapitres de la cascade : du premier jusqu'à `upTo` (par défaut le dernier), seulement ceux qui ont des cartes. */
export function cascadePath(
  course: CourseKey,
  upTo: number | undefined,
  cfg: ChaptersCfg,
  flash: FlashCard[],
  sources: FlashSource[],
): ChapterInfo[] {
  const all = chList(course, cfg, flash, sources).filter((c) => chCards(course, c.n, flash, sources).length)
  if (!all.length) return []
  const up = all.some((c) => c.n === upTo) ? (upTo as number) : all[all.length - 1].n
  return all.filter((c) => c.n <= up)
}
