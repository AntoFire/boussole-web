import {
  BLANK_INT, SUBJ, appendRun, blankGuidedDefault, blankScore, chPoints, chPrio, chState, dueSheets, focusList, levelOfXP, splitFiche, subRows, subXP,
  type SubjectCtx,
} from './subjects'
import { card } from './testUtils'
import type { ChProg } from './types'

const T = '2026-11-05'

describe('chState', () => {
  it('rien fait : pas commencé, première étape = lire le cours', () => {
    const s = chState(undefined, null, T)
    expect(s).toMatchObject({ lv: 0, next: 'video', due: null, dueNow: false, late: false, xp: 0 })
  })
  it('cours vu sans feuille blanche : « vu », feuille due le jour du cours', () => {
    const s = chState({ video: { seen: true, d: '2026-11-04' } }, null, T)
    expect(s).toMatchObject({ lv: 1, next: 'blank', due: '2026-11-04', dueNow: true, late: true, eff: 0, xp: 10 })
  })
  it('feuille à 70 % : « compris », revient le lendemain', () => {
    const s = chState({ video: { seen: true, d: T }, blank: [{ d: T, p: 70 }] }, null, T)
    expect(s).toMatchObject({ lv: 2, due: '2026-11-06', dueNow: false, next: 'blank', xp: 40 })
  })
  it('feuille à 100 % et quiz à 90 % : « maîtrisé », J+1 puis rien à faire', () => {
    const s = chState({ video: { seen: true }, blank: [{ d: T, p: 100 }] }, { p: 90, ok: true, d: T }, T)
    expect(s).toMatchObject({ lv: 3, streak: 1, due: '2026-11-06', next: 'done' })
    expect(s.xp).toBe(10 + 30 + 20 + 100)
  })
  it('feuille réussie sans quiz : prochaine étape = quiz', () => {
    expect(chState({ blank: [{ d: T, p: 90 }] }, null, T).next).toBe('quiz')
  })
  it('4 feuilles réussies de suite + quiz : consolidé, intervalle de 16 jours', () => {
    const blank = ['2026-10-10', '2026-10-11', '2026-10-14', '2026-10-21'].map((d) => ({ d, p: 90 }))
    const s = chState({ blank }, { p: 100, ok: true, d: '2026-10-21' }, '2026-10-22')
    expect(s.lv).toBe(4)
    expect(s.due).toBe('2026-11-06') // 21 oct + BLANK_INT[3] = 16 j
    expect(BLANK_INT[3]).toBe(16)
  })
  it('une feuille ratée casse la série et ramène à J+1', () => {
    const s = chState({ blank: [{ d: '2026-11-01', p: 90 }, { d: '2026-11-02', p: 50 }] }, null, T)
    expect(s).toMatchObject({ streak: 0, due: '2026-11-03', late: true, dueNow: true, next: 'review' })
  })
  it('plusieurs essais le même jour : seul le dernier compte pour la série', () => {
    const s = chState({ blank: [{ d: T, p: 40 }, { d: T, p: 100 }] }, null, T)
    expect(s).toMatchObject({ streak: 1, best: 100, last: 100 })
  })
  it('tolère un document incomplet', () => {
    expect(chState({ blank: [{ d: T } as unknown as { d: string; p: number }] }, null, T).runs).toEqual([])
  })
})

describe('feuille blanche', () => {
  it('mode guidé au début, libre ensuite', () => {
    expect(blankGuidedDefault(chState(undefined, null, T))).toBe(true)
    const runs = [70, 80, 90].map((p, i) => ({ d: `2026-11-0${i + 1}`, p }))
    expect(blankGuidedDefault(chState({ blank: runs }, null, T))).toBe(false)
  })
  it('score = points cochés', () => {
    expect(blankScore([true, false, true])).toBe(67)
    expect(blankScore([])).toBe(0)
  })
  it('garde les 30 derniers essais', () => {
    let runs: { d: string; p: number }[] = []
    for (let i = 0; i < 35; i++) runs = appendRun(runs, { d: T, p: i })
    expect(runs).toHaveLength(30)
    expect(runs[0].p).toBe(5)
  })
  it('points clés : enregistrés, sinon tirés des cartes de cours', () => {
    const cards = [card('a', { q: 'Q1', choices: ['x', 'y'], answer: 1 }), card('b', { kind: 'exercice' })]
    expect(chPoints({ points: ['p1'] }, cards)).toEqual({ pts: ['p1'], src: 'saved' })
    expect(chPoints(undefined, cards)).toEqual({ pts: ['Q1 → y'], src: 'cards' })
  })
  it('fiche découpée en phrases', () => {
    // comme l'artifact : coupe après « . » ou « ; » seulement devant une majuscule, un chiffre, « ( » ou « « »
    expect(splitFiche('ln(ab) = ln a + ln b. Résoudre e^x = 5 ; prendre ln. (x²)\' = 2x.')).toEqual(['ln(ab) = ln a + ln b.', 'Résoudre e^x = 5 ; prendre ln.', "(x²)' = 2x."])
  })
})

describe('matières', () => {
  const chprog: Record<string, Partial<ChProg>> = {
    'MATH-1': { video: { seen: true, d: '2026-11-04' }, blank: [{ d: T, p: 100 }] },
    'MATH-2': { video: { seen: true, d: '2026-11-03' } },
  }
  const ctx: SubjectCtx = {
    cfg: { MATH: { chapters: [{ n: 1, label: '1 · Algèbre' }, { n: 2, label: '2 · Dérivées' }, { n: 3, label: '3 · Matrices' }] } },
    flash: [card('m1', { course: 'MATH', ch: 1 }), card('x99', { course: 'MATH', ch: 99 })],
    sources: [],
    chprog,
    cascade: { MATH: { '1': { p: 90, ok: true, d: T } } },
    evals: [{ id: 'e', course: 'MATH', title: 'Quiz', at: '2026-11-10', weight: 20 }],
    today: T,
  }
  it('Matières : GIF, IFT, SIO, Maths', () => {
    expect(SUBJ).toEqual(['GIF', 'IFT', 'SIO', 'MATH'])
  })
  it('liste des chapitres sans « Autres notions » (99)', () => {
    expect(subRows('MATH', ctx).map((r) => r.n)).toEqual([1, 2, 3])
  })
  it('XP et niveau', () => {
    const xp = subXP(subRows('MATH', ctx))
    expect(xp).toBe(160 + 10)
    expect(levelOfXP(xp)).toBe(1)
    expect(levelOfXP(500)).toBe(2)
  })
  it('feuilles dues : chapitre vu non fait, pas un chapitre jamais ouvert', () => {
    expect(dueSheets(['MATH'], ctx).map((r) => r.n)).toEqual([2])
  })
  it('priorités : chapitre maîtrisé exclu, retard et éval proche en tête', () => {
    const f = focusList(['MATH'], ctx, 3)
    expect(f.map((r) => r.n)).toEqual([2, 3])
    expect(chPrio('MATH', f[0].st, ctx.evals, T)).toBeGreaterThan(chPrio('MATH', f[1].st, ctx.evals, T))
  })
})
