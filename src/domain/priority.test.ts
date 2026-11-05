import { dueList, lampadaire, nextEvalFor, priority, reason } from './priority'
import type { Concept, Evaluation } from './types'

const T = '2026-10-07'
const c = (o: Partial<Concept>): Concept => ({ id: 'x', name: 'N', course: 'GIF', status: 'vert', ...o })
const ev = (o: Partial<Evaluation>): Evaluation => ({ id: 'e', course: 'GIF', title: 'Quiz 2', at: '2026-10-10T09:30', weight: 6, ...o })

describe('priority', () => {
  it('notion consolidée : −1', () => {
    expect(priority(c({ status: 'consolide' }), [], T)).toBe(-1)
  })
  it('acquise, pas due, sans éval : 0', () => {
    expect(priority(c({ nextDue: '2026-10-20' }), [], T)).toBe(0)
  })
  it('rouge due aujourd’hui avec éval dans 3 jours (poids 6) : 20 + 15 + 28 + 40', () => {
    expect(priority(c({ status: 'rouge', nextDue: T }), [ev({})], T)).toBe(103)
  })
  it('poids ≥ 15 : la part « éval » est multipliée par 1,5', () => {
    expect(priority(c({ status: 'rouge', nextDue: T }), [ev({ weight: 20 })], T)).toBe(117)
  })
  it('retard plafonné à 20 jours', () => {
    expect(priority(c({ status: 'vert', nextDue: '2026-08-01' }), [], T)).toBe(40)
  })
  it('fragile due : 20 + 8', () => {
    expect(priority(c({ status: 'jaune', nextDue: T }), [], T)).toBe(28)
  })
  it('sans nextDue : traitée comme due aujourd’hui', () => {
    expect(priority(c({ status: 'vert', nextDue: undefined }), [], T)).toBe(20)
  })
})

describe('nextEvalFor', () => {
  it('éval propre si à venir', () => {
    expect(nextEvalFor(c({ evalId: 'q' }), [ev({ id: 'q', at: '2026-10-12' }), ev({ id: 'z', at: '2026-10-08' })], T)?.id).toBe('q')
  })
  it('éval propre passée : prochaine éval de la matière', () => {
    expect(nextEvalFor(c({ evalId: 'q' }), [ev({ id: 'q', at: '2026-10-01' }), ev({ id: 'z', at: '2026-10-08' })], T)?.id).toBe('z')
  })
  it('aucune éval à venir : null', () => {
    expect(nextEvalFor(c({}), [ev({ at: '2026-09-01' })], T)).toBeNull()
  })
})

describe('reason et dueList', () => {
  it('raison lisible', () => {
    expect(reason(c({ nextDue: '2026-10-05', diffType: 'Calcul' }), [ev({})], T)).toBe('en retard de 2 j · Quiz 2 dans 3 j (6 %) · calcul')
  })
  it('dueList exclut les consolidées et les non dues', () => {
    const list = dueList([c({ id: 'a', nextDue: T }), c({ id: 'b', nextDue: '2026-10-09' }), c({ id: 'd', status: 'consolide', nextDue: T })], T)
    expect(list.map((x) => x.id)).toEqual(['a'])
  })
})

describe('lampadaire', () => {
  it('ramène la notion prioritaire au chapitre le plus bas dû de sa matière', () => {
    const A = c({ id: 'A', ch: 3, status: 'rouge', nextDue: T })
    const B = c({ id: 'B', ch: 1, status: 'jaune', nextDue: T })
    const C = c({ id: 'C', ch: 2, status: 'vert', nextDue: '2026-10-20', course: 'STT' })
    const r = lampadaire([A, B, C], [ev({ at: '2026-10-09' })], T)
    expect(r.lamp?.id).toBe('B')
    expect(r.after.map((x) => x.id)).toEqual(['A', 'C'])
  })
  it('rien à faire : lamp null', () => {
    expect(lampadaire([c({ status: 'consolide' })], [], T)).toEqual({ lamp: null, after: [] })
  })
})
