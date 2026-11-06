import { describe, expect, it } from 'vitest'
import { chunkWrites, hasNestedArray, planImport } from './importDump'

describe('planImport', () => {
  it("lit l'export complet de l'artifact et ignore _meta", () => {
    const p = planImport({
      _meta: { app: 'boussole', format: 'dump', version: 2, exportedAt: '2026-11-06T12:00:00.000Z', counts: { concepts: 1 } },
      concepts: { c1: { name: 'Gradient' } },
      flash: { f1: { q: '?' }, f2: { q: '!' } },
      flashprog: { main: { xp: 10 } },
    })
    expect(p.total).toBe(4)
    expect(p.counts).toEqual({ concepts: 1, flash: 2, flashprog: 1 })
    expect(p.dump.flash.f2).toEqual({ q: '!' })
    expect(p.exportedAt).toBe('2026-11-06T12:00:00.000Z')
    expect(p.skipped).toEqual([])
  })

  it("convertit l'ancien export partiel (tableaux et journal par mois)", () => {
    const p = planImport({
      app: 'boussole', version: 1, exportedAt: '2026-10-01T00:00:00Z',
      concepts: [{ id: 'a', name: 'A' }, { name: 'sans id' }],
      evals: [{ id: 'e', title: 'Examen' }],
      journal: { '2026-10': [{ d: '2026-10-01' }] },
    })
    expect(p.dump.concepts).toEqual({ a: { name: 'A' } })
    expect(p.dump.evals).toEqual({ e: { title: 'Examen' } })
    expect(p.dump.journal).toEqual({ '2026-10': { entries: [{ d: '2026-10-01' }] } })
    expect(p.skipped).toEqual(["concepts n° 2 : pas d'identifiant"])
    expect(p.exportedAt).toBe('2026-10-01T00:00:00Z')
  })

  it('écarte collections inconnues, identifiants invalides et tableaux imbriqués', () => {
    const p = planImport({
      concepts: { ok: { n: 1 }, 'a/b': { n: 2 }, bad: [1, 2], nest: { m: [[1, 2]] } },
      inconnue: { x: { n: 1 } },
    })
    expect(Object.keys(p.dump.concepts)).toEqual(['ok'])
    expect(p.skipped).toEqual([
      'concepts/a/b : identifiant invalide',
      'concepts/bad : pas un document',
      'concepts/nest : tableau dans un tableau (refusé par Firestore)',
      "collection « inconnue » inconnue de l'appli",
    ])
  })

  it('refuse un fichier vide ou qui n’est pas un objet', () => {
    expect(() => planImport([])).toThrow()
    expect(() => planImport({ app: 'autre' })).toThrow('aucun document')
  })
})

describe('hasNestedArray', () => {
  it('repère un tableau dans un tableau, même profond', () => {
    expect(hasNestedArray({ a: [1, { b: [2] }] })).toBe(false)
    expect(hasNestedArray({ a: [{ b: [[2]] }] })).toBe(true)
  })
})

describe('chunkWrites', () => {
  it('coupe par nombre et par taille', () => {
    const dump = { flash: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`f${i}`, { q: 'x'.repeat(100) }])) }
    expect(chunkWrites(dump, 2).map((c) => c.length)).toEqual([2, 2, 1])
    expect(chunkWrites(dump, 400, 250).map((c) => c.length)).toEqual([2, 2, 1])
    expect(chunkWrites(dump).flat().map((w) => w.id)).toEqual(['f0', 'f1', 'f2', 'f3', 'f4'])
  })
})
