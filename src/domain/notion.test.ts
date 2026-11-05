import { applyScore, contactOf, levelOf, openMissions, stageLabel } from './notion'

const T = '2026-10-07'

describe('applyScore', () => {
  it('≥ 85 : série +1, acquis, retour à J+3 puis J+7 puis J+16', () => {
    expect(applyScore({ streak: 0 }, 90, T)).toEqual({ streak: 1, status: 'vert', nextDue: '2026-10-10', lastReview: T })
    expect(applyScore({ streak: 1 }, 85, T)).toMatchObject({ streak: 2, status: 'vert', nextDue: '2026-10-14' })
  })
  it('3e réussite d’affilée : consolidée, retour à J+16', () => {
    expect(applyScore({ streak: 2 }, 100, T)).toMatchObject({ streak: 3, status: 'consolide', nextDue: '2026-10-23' })
  })
  it('60-84 : fragile, série remise à 0, J+1', () => {
    expect(applyScore({ streak: 2 }, 84, T)).toMatchObject({ streak: 0, status: 'jaune', nextDue: '2026-10-08' })
    expect(applyScore({ streak: 2 }, 60, T)).toMatchObject({ status: 'jaune' })
  })
  it('< 60 : à retravailler, série à 0, J+1', () => {
    expect(applyScore({ streak: 2 }, 59, T)).toMatchObject({ streak: 0, status: 'rouge', nextDue: '2026-10-08' })
  })
  it('streak absent est traité comme 0', () => {
    expect(applyScore({}, 90, T).streak).toBe(1)
  })
})

describe('contact, niveau, étape', () => {
  it('aucun historique : à découvrir, niveau 1', () => {
    expect(contactOf({})).toBe(0)
    expect(levelOf({})).toBe(1)
    expect(stageLabel({})).toBe('À découvrir')
  })
  it('historique non vide : contact = série + 1 (au moins 1)', () => {
    expect(contactOf({ history: ['q'], streak: 0 })).toBe(1)
    expect(contactOf({ history: ['q'], streak: 2 })).toBe(3)
    expect(stageLabel({ history: ['q'], streak: 2 })).toBe('R3 · Liens')
  })
  it('contact explicite prioritaire, plafonné au niveau 4', () => {
    expect(levelOf({ contact: 7 })).toBe(4)
    expect(stageLabel({ contact: 5 })).toBe('R4+ · Examen')
  })
})

describe('openMissions', () => {
  it('ne garde que les missions non faites ; tolère l’absence', () => {
    expect(openMissions({})).toEqual([])
    expect(openMissions({ missions: [{ t: 'a' }, { t: 'b', done: true }] })).toEqual([{ t: 'a' }])
  })
})
