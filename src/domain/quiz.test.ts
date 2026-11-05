import { QZ_N, drawQuiz, isRight, progAfterQuiz, quizScore } from './quiz'
import { card, seeded } from './testUtils'
import type { FlashProg } from './types'

const T = '2026-11-05'
const empty = (): FlashProg => ({ cards: {}, days: {}, xp: 0, hist: [], cascade: {} })

describe('drawQuiz', () => {
  const ex = Array.from({ length: 8 }, (_, i) => card(`e${i}`, { kind: 'exercice', choices: ['a', 'b', 'c', 'd'], answer: 2 }))
  const co = Array.from({ length: 8 }, (_, i) => card(`c${i}`, { choices: ['a', 'b', 'c'], answer: 1 }))
  it('10 questions, au moins la moitié d’exercices', () => {
    const items = drawQuiz([...ex, ...co], {}, QZ_N, seeded(3))
    expect(items).toHaveLength(10)
    expect(items.filter((x) => x.kind === 'exercice').length).toBeGreaterThanOrEqual(5)
  })
  it('ratées d’abord', () => {
    const prog = { c7: { box: 1, last: 0 as const } }
    const items = drawQuiz([...co], prog, 3, seeded(1))
    expect(items.map((x) => x.id)).toContain('c7')
  })
  it('écarte les cartes mal formées et complète avec ce qui existe', () => {
    const bad = card('bad', { choices: ['seul'] })
    const items = drawQuiz([bad, co[0], co[1]], {}, QZ_N, seeded(2))
    expect(items.map((x) => x.id).sort()).toEqual(['c0', 'c1'])
  })
  it('choix mélangés mais réponse retrouvée par l’ordre', () => {
    const [it] = drawQuiz([ex[0]], {}, 1, seeded(5))
    it.pick = it.order.indexOf(2)
    expect(isRight(it)).toBe(true)
  })
})

describe('progAfterQuiz', () => {
  it('cascade du chapitre, boîtes, jour, historique', () => {
    const items = drawQuiz([card('a', { course: 'MATH' }), card('b', { course: 'MATH' })], {}, 2, seeded(4))
    items[0].pick = items[0].order.indexOf(items[0].answer)
    items[1].pick = items[1].order.indexOf(items[1].answer === 0 ? 1 : 0)
    expect(quizScore(items)).toEqual({ ok: 1, n: 2, p: 50 })
    const p = progAfterQuiz(empty(), items, 'MATH', 1, T, '2026-11-05T21:00:00Z')
    expect(p.cascade.MATH['1']).toEqual({ p: 50, ok: false, d: T })
    expect(p.days[T]).toBe(2)
    expect(p.hist.at(-1)).toMatchObject({ kind: 'quiz-chapitre', n: 2, ok: 1, c: 'MATH' })
    expect(p.cards[items[0].id]).toMatchObject({ box: 1, last: 1, due: '2026-11-06' })
    expect(p.cards[items[1].id]).toMatchObject({ box: 1, last: 0, due: '2026-11-06' })
    expect(p.xp).toBe(2)
  })
})
