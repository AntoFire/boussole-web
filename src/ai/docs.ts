import type { CDoc, CDocChunk, CourseKey } from '../domain/types'
import type { DataStore } from '../data/store'
import type { Chunk } from './chunk'

/** Enregistre un cours importé : d'abord les morceaux, puis les métadonnées (qui ne existent que si tout est écrit). */
export async function saveCourseDoc(
  store: DataStore,
  o: { course: CourseKey; ch: number; name: string; numPages: number; chars: number; chunks: Chunk[] },
  now = new Date(),
): Promise<{ id: string; doc: CDoc }> {
  const id = `${o.course}-${o.ch}-${now.getTime().toString(36)}`
  await Promise.all(
    o.chunks.map((c) => store.setDoc(`cdocchunks/${id}-${c.n}`, { docId: id, n: c.n, p1: c.p1, p2: c.p2, text: c.text } satisfies CDocChunk)),
  )
  const doc: CDoc = { course: o.course, ch: o.ch, name: o.name.slice(0, 200), pages: o.numPages, chars: o.chars, chunks: o.chunks.length, created: now.toISOString() }
  await store.setDoc(`cdocs/${id}`, doc)
  return { id, doc }
}

/** Relit les morceaux d'un cours, dans l'ordre. */
export async function loadCourseChunks(store: DataStore, id: string, count: number): Promise<Chunk[]> {
  const out: Chunk[] = []
  for (let n = 1; n <= count; n++) {
    const c = await store.getDoc<CDocChunk>(`cdocchunks/${id}-${n}`)
    if (!c) throw new Error('Le texte de ce cours est incomplet : réimporte le PDF.')
    out.push({ n: c.n, p1: c.p1, p2: c.p2, text: c.text })
  }
  return out
}

/** Supprime un cours importé (métadonnées d'abord, pour qu'il disparaisse de la liste). */
export async function deleteCourseDoc(store: DataStore, id: string, count: number): Promise<void> {
  await store.deleteDoc(`cdocs/${id}`)
  await Promise.all(Array.from({ length: count }, (_, i) => store.deleteDoc(`cdocchunks/${id}-${i + 1}`)))
}
