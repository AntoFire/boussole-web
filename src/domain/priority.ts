import { dayDiff } from './dates'
import type { Concept, Evaluation } from './types'

export const conceptCh = (c: Pick<Concept, 'ch'>): number => (typeof c.ch === 'number' ? c.ch : 99)

/** Prochaine évaluation liée à la notion (la sienne si à venir, sinon la prochaine de sa matière). */
export function nextEvalFor(c: Pick<Concept, 'evalId' | 'course'>, evals: Evaluation[], todayStr: string): Evaluation | null {
  const own = c.evalId ? evals.find((e) => e.id === c.evalId) : undefined
  if (own && dayDiff(own.at, todayStr) >= 0) return own
  const up = evals
    .filter((e) => e.course === c.course && dayDiff(e.at, todayStr) >= 0)
    .sort((a, b) => a.at.localeCompare(b.at))
  return up[0] ?? null
}

export function priority(c: Concept, evals: Evaluation[], todayStr: string): number {
  if (c.status === 'consolide') return -1
  const nd = c.nextDue ?? todayStr
  const late = Math.max(0, dayDiff(todayStr, nd))
  const due = dayDiff(nd, todayStr) <= 0
  const ev = nextEvalFor(c, evals, todayStr)
  const evDays = ev ? dayDiff(ev.at, todayStr) : 99
  let p = 0
  if (due) p += 20 + Math.min(late, 20)
  if (c.status === 'rouge') p += 15
  else if (c.status === 'jaune') p += 8
  if (ev && evDays < 10) p += (10 - evDays) * 4 * (ev.weight >= 15 ? 1.5 : 1)
  if (c.status === 'rouge' && evDays < 10) p += 40 // priorité absolue (règle du carnet)
  return p
}

export function reason(c: Concept, evals: Evaluation[], todayStr: string): string {
  const bits: string[] = []
  const late = dayDiff(todayStr, c.nextDue ?? todayStr)
  if (late > 0) bits.push(`en retard de ${late} j`)
  else if (late === 0) bits.push("dû aujourd'hui")
  const ev = nextEvalFor(c, evals, todayStr)
  if (ev) {
    const n = dayDiff(ev.at, todayStr)
    bits.push(`${ev.title} ${n === 0 ? "aujourd'hui" : 'dans ' + n + ' j'} (${ev.weight} %)`)
  }
  if (c.diffType) bits.push(c.diffType.toLowerCase())
  return bits.join(' · ')
}

export const isDue = (c: Concept, todayStr: string): boolean =>
  c.status !== 'consolide' && dayDiff(c.nextDue ?? todayStr, todayStr) <= 0
export const dueList = (concepts: Concept[], todayStr: string): Concept[] => concepts.filter((c) => isDue(c, todayStr))

export interface Lampadaire {
  lamp: Concept | null
  after: Concept[]
}

/** Notion à faire maintenant : la plus prioritaire, ramenée au chapitre le plus bas dû de sa matière. */
export function lampadaire(concepts: Concept[], evals: Evaluation[], todayStr: string): Lampadaire {
  const ranked = concepts
    .filter((c) => c.status !== 'consolide')
    .map((c) => ({ c, p: priority(c, evals, todayStr) }))
    .sort((a, b) => b.p - a.p)
  let lamp: Concept | null = ranked[0]?.c ?? null
  if (lamp) {
    const top: Concept = lamp
    const lower = dueList(concepts, todayStr)
      .filter((c) => c.course === top.course && conceptCh(c) < conceptCh(top))
      .sort((a, b) => conceptCh(a) - conceptCh(b))
    if (lower.length) lamp = lower[0]
  }
  const after = ranked.filter((r) => r.c !== lamp).slice(0, 2).map((r) => r.c)
  return { lamp, after }
}
