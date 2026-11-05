import { cascadePath, chCards, chLabel, chList, chOf } from './chapters'
import { card } from './testUtils'
import type { ChaptersCfg, FlashSource } from './types'

const sources: FlashSource[] = [{ id: 's3', course: 'GIF', title: 'S3', url: 'u', ch: 3 }, { id: 'sx', course: 'GIF', title: 'SX', url: 'u' }]
const cfg: ChaptersCfg = { GIF: { chapters: [{ n: 1, label: 'S1 · Intro' }, { n: 3, label: 'S3 · Bayes' }] } }

describe('chapitres', () => {
  it('chOf : carte, sinon source, sinon 1', () => {
    expect(chOf({ ch: 4 }, sources)).toBe(4)
    expect(chOf({ src: 's3' }, sources)).toBe(3)
    expect(chOf({ src: 'sx' }, sources)).toBe(1)
    expect(chOf({}, sources)).toBe(1)
  })
  it('chList : config + chapitres déduits des cartes, triés', () => {
    const flash = [card('a', { ch: 1 }), card('b', { src: 's3', ch: undefined }), card('c', { ch: 7 })]
    expect(chList('GIF', cfg, flash, sources).map((c) => [c.n, c.label])).toEqual([
      [1, 'S1 · Intro'],
      [3, 'S3 · Bayes'],
      [7, 'Chapitre 7'],
    ])
  })
  it('chLabel : 99 = « Autres notions »', () => {
    expect(chLabel('GIF', 99, cfg, [], sources)).toBe('Autres notions')
    expect(chLabel('GIF', 3, cfg, [], sources)).toBe('S3 · Bayes')
    expect(chLabel('GIF', 8, cfg, [], sources)).toBe('Chapitre 8')
  })
  it('chCards exclut les cartes signalées', () => {
    expect(chCards('GIF', 1, [card('a'), card('b', { flagged: true })], sources).map((c) => c.id)).toEqual(['a'])
  })
  it('cascadePath : jusqu’au chapitre choisi, seulement ceux qui ont des cartes', () => {
    const flash = [card('a', { ch: 1 }), card('b', { ch: 3 }), card('c', { ch: 7 })]
    expect(cascadePath('GIF', 3, cfg, flash, sources).map((c) => c.n)).toEqual([1, 3])
    expect(cascadePath('GIF', undefined, cfg, flash, sources).map((c) => c.n)).toEqual([1, 3, 7])
    expect(cascadePath('GIF', 2, cfg, flash, sources).map((c) => c.n)).toEqual([1, 3, 7])
    expect(cascadePath('STT', 1, cfg, flash, sources)).toEqual([])
  })
})
