import { CAP_MS, capMs, courseT0Now, statsAdd, statsPrune, weekDelta } from './stats'
import type { BaselineDoc, StatsDoc } from './types'

const T = '2026-10-07'

describe('capMs', () => {
  it('plafonne à 60 s, borne à 0, tolère NaN', () => {
    expect(CAP_MS).toBe(60000)
    expect(capMs(90000)).toBe(60000)
    expect(capMs(-5)).toBe(0)
    expect(capMs(NaN)).toBe(0)
    expect(capMs(1234)).toBe(1234)
  })
})

describe('statsAdd', () => {
  it('cumule cartes, bonnes réponses et minutes (arrondies à 0,01) par jour et par matière', () => {
    let s = statsAdd(null, T, 'GIF', 4, 3, 30000)
    s = statsAdd(s, T, 'GIF', 2, 1, 45000)
    s = statsAdd(s, T, 'STT', 1, 1, 6000)
    expect(s.days[T]).toEqual({
      cards: 7,
      ok: 5,
      mins: 1.35,
      byCourse: { GIF: { n: 6, ok: 4, mins: 1.25 }, STT: { n: 1, ok: 1, mins: 0.1 } },
    })
  })
  it('ne modifie pas l’objet d’entrée', () => {
    const s0: StatsDoc = { days: {} }
    statsAdd(s0, T, 'GIF', 1, 1, 1000)
    expect(s0).toEqual({ days: {} })
  })
})

describe('statsPrune', () => {
  it('supprime les jours de plus de 180 jours, garde les récents', () => {
    const s = { days: { '2026-03-01': { cards: 1, ok: 1, mins: 1, byCourse: {} }, '2026-09-27': { cards: 1, ok: 1, mins: 1, byCourse: {} } } }
    expect(Object.keys(statsPrune(s, T).days)).toEqual(['2026-09-27'])
  })
})

describe('weekDelta', () => {
  const day = (cards: number, ok: number) => ({ cards, ok, mins: 1, byCourse: {} })
  it('null sans données ou si une fenêtre est vide', () => {
    expect(weekDelta(null, T)).toBeNull()
    expect(weekDelta({ days: { [T]: day(4, 3) } }, T)).toBeNull()
  })
  it('50 % la semaine d’avant puis 75 % : +25', () => {
    expect(weekDelta({ days: { '2026-09-30': day(4, 2), '2026-10-06': day(4, 3) } }, T)).toBe(25)
  })
})

describe('courseT0Now', () => {
  const b = (ch: number, p: number): BaselineDoc => ({ course: 'STT', ch, runs: [{ d: T, p, n: 6, ok: 2, mins: 1, cardIds: [] }] })
  it('moyenne T0 vs maintenant sur les chapitres communs', () => {
    const cascade = { STT: { '3': { p: 100, ok: true, d: T }, '5': { p: 50, ok: false, d: T } } }
    expect(courseT0Now('STT', [b(3, 33), b(5, 17), b(1, 80)], cascade)).toEqual({ t0: 25, now: 75, delta: 50, chapters: 2 })
  })
  it('aucun chapitre commun : valeurs nulles', () => {
    expect(courseT0Now('GIF', [b(3, 33)], {})).toEqual({ t0: null, now: null, delta: null, chapters: 0 })
  })
})
