import { addDays } from './dates'
import { shuffle, type Rng } from './random'
import type { CardState, FlashCard } from './types'

export const FL_BOX = [0, 1, 3, 7, 16, 35] as const // intervalles (jours) par boîte de Leitner
export const FL_GOAL = 10 // cartes par jour (objectif)
export const FL_STREAK_MIN = 5 // cartes pour valider la journée dans la série 🔥
export const FL_PER = 4 // cartes par chapitre (2 cours + 2 exercices)
export const FL_PASS = 0.8 // seuil pour passer au chapitre suivant

/** État Leitner d'une carte après une réponse. */
export function cardStateAfter(st: CardState | undefined, ok: boolean, todayStr: string): CardState {
  const s: CardState = { ...(st ?? { box: 0, n: 0, ok: 0 }) }
  s.n = (s.n ?? 0) + 1
  s.seen = todayStr
  s.last = ok ? 1 : 0
  if (ok) {
    s.ok = (s.ok ?? 0) + 1
    s.box = Math.min(5, (s.box ?? 0) + 1)
    s.due = addDays(todayStr, FL_BOX[s.box])
  } else {
    s.box = 1
    s.due = addDays(todayStr, 1)
  }
  return s
}

/** Cartes dues et ratées d'abord, puis jamais vues, puis les plus anciennes ; mélange préalable pour départager. */
export function rankCards(
  list: FlashCard[],
  prog: Record<string, CardState>,
  used: ReadonlySet<string>,
  todayStr: string,
  rng: Rng = Math.random,
): FlashCard[] {
  const score = (c: FlashCard): number => {
    const st = prog[c.id]
    if (!st) return 2
    if (st.due && st.due <= todayStr) return st.last === 0 ? 0 : 1
    if (st.last === 0) return 1.5
    return 3
  }
  return shuffle(
    list.filter((c) => !used.has(c.id)),
    rng,
  ).sort((a, b) => score(a) - score(b) || String(prog[a.id]?.seen ?? '').localeCompare(String(prog[b.id]?.seen ?? '')))
}

const isEx = (c: FlashCard) => c.kind === 'exercice'

/** Bloc de 4 cartes d'un chapitre : 2 cours + 2 exercices, cours d'abord. Marque les cartes tirées dans `used`. */
export function buildBlock(
  all: FlashCard[],
  prog: Record<string, CardState>,
  used: Set<string>,
  todayStr: string,
  avoid: ReadonlySet<string> = new Set(),
  rng: Rng = Math.random,
): FlashCard[] {
  const none = new Set<string>()
  const pool = (list: FlashCard[]): FlashCard[] => {
    const fresh = rankCards(list, prog, used, todayStr, rng)
    const ids = new Set(fresh.map((c) => c.id))
    return [...fresh, ...rankCards(list.filter((c) => !ids.has(c.id) && !avoid.has(c.id)), prog, none, todayStr, rng)]
  }
  const co = pool(all.filter((c) => !isEx(c)))
  const ex = pool(all.filter(isEx))
  let sel = [...co.slice(0, 2), ...ex.slice(0, 2)]
  if (sel.length < FL_PER) sel = [...sel, ...[...ex.slice(2), ...co.slice(2)].slice(0, FL_PER - sel.length)]
  if (sel.length < FL_PER) {
    const ids = new Set(sel.map((c) => c.id))
    sel = [...sel, ...rankCards(all.filter((c) => !ids.has(c.id)), prog, none, todayStr, rng).slice(0, FL_PER - sel.length)]
  }
  sel.sort((a, b) => Number(isEx(a)) - Number(isEx(b)))
  sel.forEach((c) => used.add(c.id))
  return sel
}

/** Série 🔥 : jours consécutifs avec au moins 5 cartes ; la journée en cours ne casse pas la série. */
export function streak(days: Record<string, number>, todayStr: string): number {
  let n = 0
  let day = todayStr
  if ((days[day] ?? 0) < FL_STREAK_MIN) day = addDays(day, -1)
  while ((days[day] ?? 0) >= FL_STREAK_MIN) {
    n++
    day = addDays(day, -1)
  }
  return n
}
