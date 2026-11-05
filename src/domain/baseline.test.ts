import { baselineAppend, baselineSample, BASE_PER } from './baseline'
import { card, seeded } from './testUtils'

const ch3 = (id: string, kind: 'concept' | 'exercice', o = {}) => card(id, { kind, ch: 3, ...o })
const chOfCard = (c: { ch?: number }) => c.ch ?? 1

describe('baselineSample', () => {
  it('6 cartes : 3 cours + 3 exercices, sans carte signalée', () => {
    const pool = [
      ...Array.from({ length: 8 }, (_, i) => ch3(`c${i}`, 'concept')),
      ...Array.from({ length: 8 }, (_, i) => ch3(`x${i}`, 'exercice')),
      ch3('bad', 'concept', { flagged: true }),
      card('autre', { ch: 4 }),
      card('autreMatiere', { ch: 3, course: 'STT' }),
    ]
    const r = baselineSample(pool, 'GIF', 3, chOfCard, seeded(5))
    expect(BASE_PER).toBe(6)
    expect(r.cards).toHaveLength(6)
    expect(r.cards.filter((c) => c.kind === 'exercice')).toHaveLength(3)
    expect(r.cards.some((c) => c.id === 'bad' || c.id === 'autre' || c.id === 'autreMatiere')).toBe(false)
    expect(r.reduced).toBe(false)
  })
  it('un seul exercice : complété par des cours, 6 cartes', () => {
    const pool = [...Array.from({ length: 8 }, (_, i) => ch3(`c${i}`, 'concept')), ch3('x0', 'exercice')]
    const r = baselineSample(pool, 'GIF', 3, chOfCard, seeded(5))
    expect(r.cards).toHaveLength(6)
    expect(r.cards.filter((c) => c.kind === 'exercice')).toHaveLength(1)
  })
  it('chapitre de 2 cartes : « échantillon réduit »', () => {
    const r = baselineSample([ch3('a', 'concept'), ch3('b', 'exercice')], 'GIF', 3, chOfCard)
    expect(r.cards).toHaveLength(2)
    expect(r.reduced).toBe(true)
  })
  it('chapitre vide : aucune carte, sans erreur', () => {
    expect(baselineSample([], 'GIF', 9, chOfCard)).toEqual({ cards: [], reduced: true })
  })
})

describe('baselineAppend', () => {
  const run = (p: number) => ({ d: '2026-10-07', p, n: 6, ok: 2, mins: 3, cardIds: [] })
  it('crée le document avec T0 = runs[0]', () => {
    expect(baselineAppend(null, 'STT', 3, run(33))).toEqual({ course: 'STT', ch: 3, runs: [run(33)] })
  })
  it('garde T0 intact et ne modifie pas l’entrée', () => {
    const doc = baselineAppend(null, 'STT', 3, run(33))
    const next = baselineAppend(doc, 'STT', 3, run(67))
    expect(next.runs.map((r) => r.p)).toEqual([33, 67])
    expect(doc.runs).toHaveLength(1)
  })
})
