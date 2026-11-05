import { bilanBuild, bilanView, type BilanInput } from './bilan'
import type { BaselineDoc } from './types'

const T = '2026-10-07'
const empty: BilanInput = { stats: null, baselines: [], cascade: undefined, cards: {}, streak: 0, missed: [], tomorrow: [] }

describe('bilanBuild', () => {
  it('première journée : aucune valeur NaN, pct/prev nuls', () => {
    const b = bilanBuild(empty, T)
    expect(b).toMatchObject({ cards: 0, ok: 0, pct: null, mins: 0, prev: null, byCourse: [], wins: [], stuck: [], tomorrow: [] })
    expect(JSON.stringify(b)).not.toContain('NaN')
  })
  it('compare avec la veille', () => {
    const stats = {
      days: {
        [T]: { cards: 8, ok: 6, mins: 4.5, byCourse: {} },
        '2026-10-06': { cards: 4, ok: 2, mins: 2, byCourse: {} },
      },
    }
    const b = bilanBuild({ ...empty, stats }, T)
    expect(b).toMatchObject({ cards: 8, pct: 75, mins: 4.5, prev: { cards: 4, pct: 50, mins: 2 } })
  })
  it('micro-victoires : chapitre validé, série, gain vs T0, erreurs corrigées', () => {
    const baselines: BaselineDoc[] = [{ course: 'STT', ch: 3, runs: [{ d: '2026-10-01', p: 33, n: 6, ok: 2, mins: 1, cardIds: [] }] }]
    const b = bilanBuild(
      {
        ...empty,
        baselines,
        cascade: { STT: { '3': { p: 100, ok: true, d: T } } },
        streak: 3,
        cards: { a: { box: 1, seen: T, last: 1, n: 2, ok: 1 }, b: { box: 1, seen: T, last: 1, n: 1, ok: 1 } },
      },
      T,
    )
    expect(b.wins).toEqual(['STT ch.3 validé (T0 33 % → 100 %)', 'Série de 3 jours', '+67 pts vs T0 en STT', '1 erreur corrigée'])
    expect(b.byCourse).toEqual([{ course: 'STT', t0: 33, now: 100, delta: 67 }])
  })
  it('garde 3 éléments pour « ce qui a coincé » et « demain »', () => {
    const b = bilanBuild({ ...empty, missed: ['a', 'b', 'c', 'd'], tomorrow: ['1', '2', '3', '4'] }, T)
    expect(b.stuck).toEqual(['a', 'b', 'c'])
    expect(b.tomorrow).toEqual(['1', '2', '3'])
  })
})

describe('bilanView', () => {
  it('full : tout visible', () => {
    expect(bilanView('full')).toEqual({ showTomorrow: true, showNote: true, showSave: true, closed: false })
  })
  it('readonly : chiffres seulement', () => {
    expect(bilanView('readonly')).toEqual({ showTomorrow: false, showNote: false, showSave: false, closed: false })
  })
  it('closed', () => {
    expect(bilanView('closed')).toEqual({ showTomorrow: false, showNote: false, showSave: false, closed: true })
  })
})
