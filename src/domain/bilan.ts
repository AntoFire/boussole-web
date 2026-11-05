import { addDays } from './dates'
import type { EveningMode } from './eveningMode'
import { courseT0Now } from './stats'
import { COURSE_KEYS, type Bilan, type BaselineDoc, type CardState, type CascadeEntry, type StatsDoc } from './types'

export interface BilanInput {
  stats: StatsDoc | null
  baselines: BaselineDoc[]
  cascade: Record<string, Record<string, CascadeEntry>> | undefined
  cards: Record<string, CardState>
  streak: number
  missed: string[]
  tomorrow: string[]
}

const pct = (ok: number, n: number): number | null => (n > 0 ? Math.round((ok / n) * 100) : null)

export function bilanBuild(i: BilanInput, today: string): Bilan {
  const cur = i.stats?.days[today]
  const cards = cur?.cards ?? 0
  const ok = cur?.ok ?? 0
  const pd = i.stats?.days[addDays(today, -1)]
  const prev = pd ? { cards: pd.cards, ok: pd.ok, pct: pct(pd.ok, pd.cards), mins: pd.mins } : null

  const byCourse = COURSE_KEYS.map((course) => ({ course, ...courseT0Now(course, i.baselines, i.cascade) }))
    .filter((r) => r.chapters > 0)
    .map(({ course, t0, now, delta }) => ({ course, t0, now, delta }))

  const wins: string[] = []
  for (const b of i.baselines) {
    const e = i.cascade?.[b.course]?.[String(b.ch)]
    const p0 = b.runs[0]?.p
    if (e && e.ok && e.d === today && typeof p0 === 'number' && p0 < 80) {
      wins.push(`${b.course} ch.${b.ch} validé (T0 ${p0} % → ${e.p} %)`)
    }
  }
  if (i.streak >= 2) wins.push(`Série de ${i.streak} jours`)
  for (const r of byCourse) if (r.delta !== null && r.delta >= 20) wins.push(`+${r.delta} pts vs T0 en ${r.course}`)
  const corrected = Object.values(i.cards).filter((s) => s.seen === today && s.last === 1 && (s.n ?? 0) > (s.ok ?? 0)).length
  if (corrected > 0) wins.push(corrected === 1 ? '1 erreur corrigée' : `${corrected} erreurs corrigées`)

  return {
    day: today,
    cards,
    ok,
    pct: pct(ok, cards),
    mins: cur?.mins ?? 0,
    prev,
    byCourse,
    wins,
    stuck: i.missed.slice(0, 3),
    tomorrow: i.tomorrow.slice(0, 3),
  }
}

export function bilanView(mode: EveningMode): { showTomorrow: boolean; showNote: boolean; showSave: boolean; closed: boolean } {
  const full = mode === 'full'
  return { showTomorrow: full, showNote: full, showSave: full, closed: mode === 'closed' }
}
