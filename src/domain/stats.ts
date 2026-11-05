import { addDays, dayDiff } from './dates'
import type { BaselineDoc, CascadeEntry, CourseKey, DayStats, StatsDoc } from './types'

export const CAP_MS = 60000
const round2 = (x: number) => Math.round(x * 100) / 100

export function capMs(ms: number): number {
  if (!Number.isFinite(ms)) return 0
  return Math.min(Math.max(ms, 0), CAP_MS)
}

/** Ajoute des cartes, bonnes réponses et durée à la journée `day` (sans modifier `stats`). */
export function statsAdd(stats: StatsDoc | null, day: string, course: CourseKey, n: number, ok: number, ms: number): StatsDoc {
  const days = { ...(stats?.days ?? {}) }
  const prev: DayStats = days[day] ?? { cards: 0, ok: 0, mins: 0, byCourse: {} }
  const pc = prev.byCourse[course] ?? { n: 0, ok: 0, mins: 0 }
  const mins = ms / 60000
  days[day] = {
    cards: prev.cards + n,
    ok: prev.ok + ok,
    mins: round2(prev.mins + mins),
    byCourse: { ...prev.byCourse, [course]: { n: pc.n + n, ok: pc.ok + ok, mins: round2(pc.mins + mins) } },
  }
  return { days }
}

export function statsPrune(stats: StatsDoc, todayStr: string, keep = 180): StatsDoc {
  const days: Record<string, DayStats> = {}
  for (const [k, v] of Object.entries(stats.days)) if (dayDiff(todayStr, k) <= keep) days[k] = v
  return { days }
}

function windowTotals(stats: StatsDoc, endDay: string): { cards: number; ok: number } {
  let cards = 0
  let ok = 0
  for (let i = 0; i < 7; i++) {
    const d = stats.days[addDays(endDay, -i)]
    if (d) {
      cards += d.cards
      ok += d.ok
    }
  }
  return { cards, ok }
}

/** Écart de précision (points) entre les 7 derniers jours et les 7 précédents ; null si une fenêtre est vide. */
export function weekDelta(stats: StatsDoc | null, todayStr: string): number | null {
  if (!stats) return null
  const a = windowTotals(stats, todayStr)
  const b = windowTotals(stats, addDays(todayStr, -7))
  if (!a.cards || !b.cards) return null
  return Math.round(100 * (a.ok / a.cards - b.ok / b.cards))
}

export interface T0Now {
  t0: number | null
  now: number | null
  delta: number | null
  chapters: number
}

/** Moyenne T0 vs maintenant sur les chapitres qui ont à la fois un test d'entrée et un résultat de cascade. */
export function courseT0Now(
  course: CourseKey,
  baselines: BaselineDoc[],
  cascade: Record<string, Record<string, CascadeEntry>> | undefined,
): T0Now {
  const pairs: [number, number][] = []
  for (const b of baselines) {
    if (b.course !== course || !b.runs.length) continue
    const now = cascade?.[course]?.[String(b.ch)]?.p
    if (typeof now === 'number') pairs.push([b.runs[0].p, now])
  }
  if (!pairs.length) return { t0: null, now: null, delta: null, chapters: 0 }
  const avg = (i: 0 | 1) => Math.round(pairs.reduce((s, p) => s + p[i], 0) / pairs.length)
  const t0 = avg(0)
  const now = avg(1)
  return { t0, now, delta: now - t0, chapters: pairs.length }
}
