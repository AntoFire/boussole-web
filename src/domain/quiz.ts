import { addDays } from './dates'
import { FL_BOX, FL_PASS } from './flash'
import { shuffle, type Rng } from './random'
import type { CourseKey, FlashCard, FlashProg } from './types'

export const QZ_N = 10 // questions d'un quiz d'examen de chapitre

export interface QuizItem {
  id: string
  q: string
  choices: string[]
  answer: number
  why: string
  kind: string
  /** ordre d'affichage des choix (indices dans `choices`) */
  order: number[]
  /** indice choisi dans `order`, ou null */
  pick: number | null
  flag: boolean
}

const valid = (x: FlashCard) => Array.isArray(x.choices) && x.choices.length > 1 && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < x.choices.length

/** Ratées d'abord, puis jamais vues, puis le reste ; au moins la moitié d'exercices si possible ; choix mélangés. */
export function drawQuiz(cards: FlashCard[], prog: FlashProg['cards'], n = QZ_N, rng: Rng = Math.random): QuizItem[] {
  const w = (x: FlashCard) => (prog[x.id]?.last === 0 ? 0 : prog[x.id] ? 1 : 2)
  const sh = shuffle(cards.filter(valid), rng).sort((a, b) => w(a) - w(b))
  const ex = sh.filter((x) => x.kind === 'exercice')
  const co = sh.filter((x) => x.kind !== 'exercice')
  const want = Math.min(n, sh.length)
  const nEx = Math.min(ex.length, Math.ceil(want / 2))
  let sel = [...ex.slice(0, nEx), ...co.slice(0, want - nEx)]
  if (sel.length < want) {
    const ids = new Set(sel.map((x) => x.id))
    sel = [...sel, ...sh.filter((x) => !ids.has(x.id)).slice(0, want - sel.length)]
  }
  return shuffle(sel, rng).map((x) => ({
    id: x.id,
    q: x.q,
    choices: x.choices,
    answer: x.answer,
    why: x.why ?? '',
    kind: x.kind,
    order: shuffle(
      x.choices.map((_, i) => i),
      rng,
    ),
    pick: null,
    flag: false,
  }))
}

export const isRight = (it: QuizItem) => it.pick != null && it.order[it.pick] === it.answer
export const quizScore = (items: QuizItem[]) => {
  const ok = items.filter(isRight).length
  return { ok, n: items.length, p: items.length ? Math.round((ok / items.length) * 100) : 0 }
}

/** Le quiz compte comme le quiz du chapitre (niveau 🟢) et met à jour les boîtes de Leitner des cartes. */
export function progAfterQuiz(prog: FlashProg, items: QuizItem[], course: CourseKey, ch: number, todayStr: string, nowIso: string): FlashProg {
  const { ok, n, p } = quizScore(items)
  const cards = { ...prog.cards }
  for (const x of items) {
    const right = isRight(x)
    const st = cards[x.id] ?? { box: 0, n: 0, ok: 0 }
    const box = right ? Math.min(5, (st.box ?? 0) + 1) : 1
    cards[x.id] = { ...st, box, due: addDays(todayStr, right ? FL_BOX[box] : 1), seen: todayStr, last: right ? 1 : 0, n: (st.n ?? 0) + 1, ok: (st.ok ?? 0) + (right ? 1 : 0) }
  }
  return {
    ...prog,
    cards,
    days: { ...prog.days, [todayStr]: (prog.days[todayStr] ?? 0) + n },
    cascade: { ...prog.cascade, [course]: { ...(prog.cascade[course] ?? {}), [String(ch)]: { p, ok: p >= FL_PASS * 100, d: todayStr } } },
    hist: [...prog.hist, { d: nowIso, n, ok, c: course, kind: 'quiz-chapitre' }].slice(-200),
    xp: prog.xp + ok * 2,
  }
}
