import { shuffle, type Rng } from './random'
import type { BaselineDoc, BaselineRun, CourseKey, FlashCard } from './types'

export const BASE_PER = 6

/** Échantillon du test d'entrée : jusqu'à 6 cartes, 3 cours + 3 exercices, complétées par l'autre type. */
export function baselineSample(
  cards: FlashCard[],
  course: CourseKey,
  ch: number,
  chOfCard: (c: FlashCard) => number,
  rng: Rng = Math.random,
): { cards: FlashCard[]; reduced: boolean } {
  const pool = cards.filter((c) => !c.flagged && c.course === course && chOfCard(c) === ch)
  const ex = shuffle(pool.filter((c) => c.kind === 'exercice'), rng)
  const co = shuffle(pool.filter((c) => c.kind !== 'exercice'), rng)
  const half = BASE_PER / 2
  let takeCo = Math.min(half, co.length)
  let takeEx = Math.min(half, ex.length)
  takeCo = Math.min(co.length, takeCo + (half - takeEx))
  takeEx = Math.min(ex.length, takeEx + (half - Math.min(half, co.length)))
  const sel = [...co.slice(0, takeCo), ...ex.slice(0, takeEx)]
  return { cards: sel, reduced: sel.length < BASE_PER }
}

/** Ajoute un passage au document d'une matière/chapitre sans modifier l'ancien (runs[0] = T0). */
export function baselineAppend(doc: BaselineDoc | null, course: CourseKey, ch: number, run: BaselineRun): BaselineDoc {
  return { course, ch, runs: [...(doc?.runs ?? []), run] }
}
