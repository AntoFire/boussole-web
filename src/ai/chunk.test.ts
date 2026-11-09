import { describe, expect, it } from 'vitest'
import { BATCH_CHARS, CHUNK_CHARS, analyze, buildChunks, cleanPageText, groupBatches, pageRange, type PageText } from './chunk'

const page = (n: number, text: string): PageText => ({ n, text })
const long = (n: number) => Array.from({ length: n }, (_, i) => `Phrase numéro ${i} du cours.`).join(' ')

describe('cleanPageText', () => {
  it('recolle les mots coupés, replie les espaces et les lignes vides', () => {
    expect(cleanPageText('La régres-\nsion   linéaire\n\n\n\nest  simple ')).toBe('La régression linéaire\n\nest simple')
  })
})

describe('analyze', () => {
  it('compte les pages vides et détecte un PDF scanné', () => {
    const scanned = analyze(3, [page(1, ''), page(2, ' '), page(3, 'a')])
    expect(scanned).toMatchObject({ emptyPages: 3, scanned: true })
    const ok = analyze(2, [page(1, long(30)), page(2, long(30))])
    expect(ok).toMatchObject({ emptyPages: 0, scanned: false })
    expect(ok.chars).toBeGreaterThan(200)
  })
  it('considère un PDF presque vide comme non exploitable même avec quelques pages de texte', () => {
    const pages = [page(1, long(30)), ...Array.from({ length: 9 }, (_, i) => page(i + 2, ''))]
    expect(analyze(10, pages).scanned).toBe(true)
  })
})

describe('buildChunks', () => {
  it('garde l’ordre des pages et marque chaque page', () => {
    const cs = buildChunks([page(1, 'Alpha'), page(2, 'Beta'), page(3, 'Gamma')])
    expect(cs).toHaveLength(1)
    expect(cs[0]).toMatchObject({ n: 1, p1: 1, p2: 3 })
    expect(cs[0].text).toBe('[p. 1]\nAlpha\n\n[p. 2]\nBeta\n\n[p. 3]\nGamma')
  })
  it('saute les pages vides', () => {
    const cs = buildChunks([page(1, 'A'), page(2, ''), page(3, 'C')])
    expect(cs[0].text).not.toContain('[p. 2]')
    expect(cs[0]).toMatchObject({ p1: 1, p2: 3 })
  })
  it('coupe en morceaux bornés sans perdre ni réordonner le texte', () => {
    const pages = Array.from({ length: 20 }, (_, i) => page(i + 1, long(60)))
    const cs = buildChunks(pages, 3000)
    expect(cs.length).toBeGreaterThan(5)
    expect(cs.every((c) => c.text.length <= 3000)).toBe(true)
    expect(cs.map((c) => c.n)).toEqual(cs.map((_, i) => i + 1))
    const firstPages = cs.map((c) => c.p1)
    expect([...firstPages].sort((a, b) => a - b)).toEqual(firstPages)
    // tout le contenu est conservé
    const all = cs.map((c) => c.text).join('\n')
    for (let i = 0; i < 60; i += 7) expect(all).toContain(`Phrase numéro ${i} du cours.`)
  })
  it('découpe une page unique plus longue que la limite', () => {
    const cs = buildChunks([page(1, 'x'.repeat(CHUNK_CHARS * 2 + 50))])
    expect(cs.length).toBeGreaterThanOrEqual(3)
    expect(cs.every((c) => c.text.length <= CHUNK_CHARS)).toBe(true)
    expect(cs.every((c) => c.p1 === 1 && c.p2 === 1)).toBe(true)
  })
})

describe('groupBatches et pageRange', () => {
  it('regroupe des morceaux consécutifs sous la limite d’un appel', () => {
    const cs = buildChunks(Array.from({ length: 40 }, (_, i) => page(i + 1, long(120))), CHUNK_CHARS)
    const bs = groupBatches(cs)
    expect(bs.length).toBeGreaterThan(1)
    expect(bs.every((b) => b.reduce((n, c) => n + c.text.length, 0) <= BATCH_CHARS)).toBe(true)
    expect(bs.flat().map((c) => c.n)).toEqual(cs.map((c) => c.n))
  })
  it('formate les pages couvertes', () => {
    const cs = buildChunks([page(4, 'a'), page(5, 'b'), page(9, 'c')])
    expect(pageRange(cs)).toBe('4-9')
    expect(pageRange(buildChunks([page(7, 'a')]))).toBe('7')
    expect(pageRange([])).toBe('')
  })
})
