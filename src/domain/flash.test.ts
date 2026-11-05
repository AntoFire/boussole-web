import { FL_BOX, FL_PASS, FL_PER, buildBlock, cardStateAfter, rankCards, streak } from './flash'
import { card, seeded } from './testUtils'

const T = '2026-10-07'

describe('constantes reprises de l’artifact', () => {
  it('valeurs', () => {
    expect([...FL_BOX]).toEqual([0, 1, 3, 7, 16, 35])
    expect(FL_PER).toBe(4)
    expect(FL_PASS).toBe(0.8)
  })
})

describe('cardStateAfter (Leitner)', () => {
  it('première bonne réponse : boîte 1, due demain', () => {
    expect(cardStateAfter(undefined, true, T)).toEqual({ box: 1, n: 1, ok: 1, seen: T, last: 1, due: '2026-10-08' })
  })
  it('bonne réponse boîte 2 → 3 : due dans 3 jours', () => {
    const s = cardStateAfter({ box: 2, n: 2, ok: 2, last: 1 }, true, T)
    expect(s).toMatchObject({ box: 3, due: '2026-10-14', n: 3, ok: 3 })
  })
  it('la boîte plafonne à 5 (35 jours)', () => {
    expect(cardStateAfter({ box: 5 }, true, T)).toMatchObject({ box: 5, due: '2026-11-11' })
  })
  it('mauvaise réponse : boîte 1, due demain, last 0, ok inchangé', () => {
    expect(cardStateAfter({ box: 4, n: 4, ok: 4 }, false, T)).toMatchObject({ box: 1, due: '2026-10-08', last: 0, n: 5, ok: 4 })
  })
  it('ne modifie pas l’état d’entrée', () => {
    const st = { box: 2, n: 1, ok: 1 }
    cardStateAfter(st, true, T)
    expect(st).toEqual({ box: 2, n: 1, ok: 1 })
  })
})

describe('rankCards', () => {
  const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => card(id))
  it('ratée due, puis due, puis jamais vue, puis ratée non due, puis vue plus tard', () => {
    const prog = {
      a: { box: 2, due: '2026-10-20', last: 1 as const }, // 3
      b: { box: 1, due: T, last: 0 as const }, // 0
      c: { box: 1, due: '2026-10-20', last: 0 as const }, // 1.5
      d: { box: 2, due: '2026-10-01', last: 1 as const }, // 1
    } // e jamais vue → 2
    const r = rankCards(cards, prog, new Set(), T, seeded(3)).map((c) => c.id)
    expect(r).toEqual(['b', 'd', 'c', 'e', 'a'])
  })
  it('exclut les cartes déjà utilisées', () => {
    expect(rankCards(cards, {}, new Set(['a', 'b']), T).map((c) => c.id).sort()).toEqual(['c', 'd', 'e'])
  })
})

describe('buildBlock', () => {
  const mk = (n: number, kind: 'concept' | 'exercice', p: string) => Array.from({ length: n }, (_, i) => card(`${p}${i}`, { kind }))
  it('4 cartes : 2 cours puis 2 exercices', () => {
    const used = new Set<string>()
    const b = buildBlock([...mk(5, 'concept', 'c'), ...mk(5, 'exercice', 'x')], {}, used, T, new Set(), seeded(2))
    expect(b).toHaveLength(4)
    expect(b.map((c) => c.kind)).toEqual(['concept', 'concept', 'exercice', 'exercice'])
    expect(used.size).toBe(4)
  })
  it('peu d’exercices : complété par des cours, exercices toujours en fin', () => {
    const b = buildBlock([...mk(5, 'concept', 'c'), ...mk(1, 'exercice', 'x')], {}, new Set(), T, new Set(), seeded(2))
    expect(b).toHaveLength(4)
    expect(b[3].kind).toBe('exercice')
  })
  it('chapitre de 2 cartes : renvoie 2 cartes', () => {
    expect(buildBlock(mk(2, 'concept', 'c'), {}, new Set(), T)).toHaveLength(2)
  })
  it('cascade épuisée : recycle les cartes vues en excluant celles à éviter (exemples corrigés)', () => {
    const all = [...mk(4, 'concept', 'c'), ...mk(4, 'exercice', 'x')]
    const used = new Set(all.map((c) => c.id))
    const b = buildBlock(all, {}, used, T, new Set(['x0', 'x1']), seeded(1))
    expect(b).toHaveLength(4)
    expect(b.map((c) => c.id)).not.toContain('x0')
    expect(b.map((c) => c.id)).not.toContain('x1')
    expect(b.filter((c) => c.kind === 'exercice').map((c) => c.id).sort()).toEqual(['x2', 'x3'])
  })
  it('cartes jamais vues dans la cascade passent avant les recyclées', () => {
    const all = [...mk(3, 'concept', 'c'), ...mk(3, 'exercice', 'x')]
    const used = new Set(['c0', 'x0'])
    const b = buildBlock(all, {}, used, T, new Set(), seeded(4))
    expect(b.map((c) => c.id).sort()).toEqual(['c1', 'c2', 'x1', 'x2'])
  })
  it('ne plante pas sur un chapitre vide', () => {
    expect(buildBlock([], {}, new Set(), T)).toEqual([])
  })
})

describe('streak 🔥', () => {
  it('jours consécutifs ≥ 5 cartes', () => {
    expect(streak({ '2026-10-07': 6, '2026-10-06': 5, '2026-10-05': 9, '2026-10-04': 2 }, T)).toBe(3)
  })
  it('la journée en cours (< 5 cartes) ne casse pas la série', () => {
    expect(streak({ '2026-10-07': 2, '2026-10-06': 5, '2026-10-05': 5 }, T)).toBe(2)
  })
  it('hier trop faible : série nulle', () => {
    expect(streak({ '2026-10-07': 1, '2026-10-06': 4 }, T)).toBe(0)
  })
})
