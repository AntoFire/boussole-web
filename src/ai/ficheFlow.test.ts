import { describe, expect, it, vi } from 'vitest'
import { buildChunks, type PageText } from './chunk'
import { AiError } from './errors'
import { MAX_BATCHES, ficheKeyPoints, generateFiche, type CallFiche } from './ficheFlow'
import type { Fiche } from './types'
import { loadCourseChunks, saveCourseDoc, deleteCourseDoc } from './docs'
import type { DataStore } from '../data/store'

const fiche = (title: string, ...kp: string[]): Fiche => ({ title, sections: [{ title: 's', definitions: [], keyPoints: kp, formulas: [], example: '' }], summary: 'r' })
const para = (i: number) => Array.from({ length: 700 }, (_, k) => `Phrase ${i}-${k}.`).join(' ')
const pages = (n: number): PageText[] => Array.from({ length: n }, (_, i) => ({ n: i + 1, text: para(i) }))

describe('generateFiche', () => {
  it('appelle le modèle lot par lot, dans l’ordre des pages, en signalant la progression', async () => {
    const chunks = buildChunks(pages(12))
    const call = vi.fn<CallFiche>(async (r) => ({ fiche: fiche(r.text.slice(0, 6)), model: 'm' }))
    const progress: string[] = []
    const r = await generateFiche({ course: 'C', chapter: 'Ch', chunks, call, onProgress: (d, t) => progress.push(`${d}/${t}`) })
    expect(r.parts.length).toBeGreaterThan(1)
    const firsts = r.parts.map((p) => Number(p.pages.split('-')[0]))
    expect([...firsts].sort((a, b) => a - b)).toEqual(firsts)
    expect(progress[0]).toBe('0/' + r.parts.length)
    expect(progress.at(-1)).toBe(`${r.parts.length}/${r.parts.length}`)
    expect(call.mock.calls.every(([q]) => q.task === 'fiche' && q.text.length <= 40_000)).toBe(true)
  })
  it('patiente puis réessaie quand la limite par minute est atteinte', async () => {
    const chunks = buildChunks(pages(1))
    const call = vi.fn<CallFiche>().mockRejectedValueOnce(new AiError('rate', 'x')).mockResolvedValue({ fiche: fiche('ok'), model: 'm' })
    const sleep = vi.fn(async () => {})
    const r = await generateFiche({ course: 'C', chapter: 'Ch', chunks, call, sleep })
    expect(r.parts).toHaveLength(1)
    expect(sleep).toHaveBeenCalledTimes(1)
  })
  it('s’arrête sur une autre erreur (plafond du jour) sans réessayer', async () => {
    const call = vi.fn<CallFiche>().mockRejectedValue(new AiError('quota', 'plafond'))
    await expect(generateFiche({ course: 'C', chapter: 'Ch', chunks: buildChunks(pages(1)), call })).rejects.toMatchObject({ kind: 'quota' })
    expect(call).toHaveBeenCalledTimes(1)
  })
  it('refuse un cours vide ou trop long avant tout appel', async () => {
    const call = vi.fn<CallFiche>()
    await expect(generateFiche({ course: 'C', chapter: 'Ch', chunks: [], call })).rejects.toMatchObject({ kind: 'invalid' })
    const huge = buildChunks(pages(MAX_BATCHES * 8))
    await expect(generateFiche({ course: 'C', chapter: 'Ch', chunks: huge, call })).rejects.toMatchObject({ kind: 'invalid' })
    expect(call).not.toHaveBeenCalled()
  })
})

describe('ficheKeyPoints', () => {
  it('rassemble les idées sans doublon et plafonne', () => {
    const parts = [{ pages: '1', fiche: fiche('a', 'Un', 'Deux') }, { pages: '2', fiche: fiche('b', 'un', 'Trois') }]
    expect(ficheKeyPoints(parts)).toEqual(['Un', 'Deux', 'Trois'])
    expect(ficheKeyPoints(parts, 2)).toEqual(['Un', 'Deux'])
  })
})

/** Mémoire minimale pour tester l'enregistrement des cours. */
function memStore(): DataStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>()
  return {
    data,
    kind: 'local',
    getDoc: async (p: string) => (data.get(p) as never) ?? null,
    setDoc: async (p: string, d: object) => void data.set(p, JSON.parse(JSON.stringify(d))),
    deleteDoc: async (p: string) => void data.delete(p),
  } as unknown as DataStore & { data: Map<string, unknown> }
}

describe('cours importés', () => {
  it('enregistre, relit dans l’ordre et supprime', async () => {
    const store = memStore()
    const chunks = buildChunks(pages(6))
    const { id, doc } = await saveCourseDoc(store, { course: 'IFT', ch: 2, name: 'cours.pdf', numPages: 6, chars: 99, chunks }, new Date('2026-11-08T12:00:00Z'))
    expect(id).toMatch(/^IFT-2-/)
    expect(doc).toMatchObject({ course: 'IFT', ch: 2, pages: 6, chunks: chunks.length })
    expect(store.data.has(`cdocs/${id}`)).toBe(true)
    const back = await loadCourseChunks(store, id, doc.chunks)
    expect(back.map((c) => c.text)).toEqual(chunks.map((c) => c.text))
    await deleteCourseDoc(store, id, doc.chunks)
    expect(store.data.size).toBe(0)
  })
  it('signale un cours incomplet', async () => {
    const store = memStore()
    await expect(loadCourseChunks(store, 'X-1-a', 2)).rejects.toThrow(/incomplet/)
  })
})
