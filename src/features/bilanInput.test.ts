import { describe, expect, it } from 'vitest'
import { missedToday, tomorrowList } from './bilanInput'
import { card } from '../domain/testUtils'
import type { Concept } from '../domain/types'

describe('missedToday', () => {
  it('ne garde que les cartes ratées aujourd’hui', () => {
    const flash = [card('a', { q: 'Qa' }), card('b', { q: 'Qb' }), card('c', { q: 'Qc' })]
    const cards = { a: { box: 1, seen: '2026-10-07', last: 0 as const }, b: { box: 2, seen: '2026-10-07', last: 1 as const }, c: { box: 1, seen: '2026-10-06', last: 0 as const } }
    expect(missedToday(cards, flash, '2026-10-07')).toEqual(['Qa'])
  })
})

describe('tomorrowList', () => {
  it('limite à 3 et ignore les consolidées', () => {
    const mk = (id: string, status: Concept['status'], nextDue: string): Concept => ({ id, name: id, course: 'STT', status, nextDue })
    const cs = [mk('a', 'rouge', '2026-10-08'), mk('b', 'jaune', '2026-10-08'), mk('c', 'vert', '2026-10-08'), mk('d', 'rouge', '2026-10-08'), mk('e', 'consolide', '2026-10-08'), mk('f', 'vert', '2026-11-01')]
    const r = tomorrowList(cs, [], '2026-10-08')
    expect(r).toHaveLength(3)
    expect(r.join()).not.toContain('e (')
    expect(r.join()).not.toContain('f (')
  })
})
