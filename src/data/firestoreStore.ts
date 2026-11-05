import type { Firestore } from 'firebase/firestore'
import { clean, splitPath, type DataStore, type Dump, type Unsubscribe, type WithId } from './store'

/** Backend Firestore : chemins users/{uid}/{collection}/{id}. Chargé à la demande (import dynamique). */
export async function createFirestoreStore(db: Firestore, uid: string): Promise<DataStore> {
  const fs = await import('firebase/firestore')
  const ref = (path: string) => {
    const [c, id] = splitPath(path)
    return fs.doc(db, 'users', uid, c, id)
  }
  const col = (name: string) => fs.collection(db, 'users', uid, name)
  const COLLECTIONS = ['concepts', 'evals', 'flash', 'sources', 'flashcfg', 'flashprog', 'journal', 'baseline', 'stats', 'bilans']

  return {
    kind: 'firebase',
    async getDoc<T>(path: string) {
      const s = await fs.getDoc(ref(path))
      return s.exists() ? (s.data() as T) : null
    },
    async setDoc(path, data) {
      await fs.setDoc(ref(path), clean(data))
    },
    async updateDoc(path, patch) {
      await fs.setDoc(ref(path), clean(patch), { merge: true })
    },
    async deleteDoc(path) {
      await fs.deleteDoc(ref(path))
    },
    subscribeCollection<T>(name: string, cb: (docs: WithId<T>[]) => void, onError?: (e: Error) => void): Unsubscribe {
      return fs.onSnapshot(
        col(name),
        (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as T) }))),
        (e) => onError?.(e),
      )
    },
    subscribeDoc<T>(path: string, cb: (data: T | null) => void, onError?: (e: Error) => void): Unsubscribe {
      return fs.onSnapshot(
        ref(path),
        (s) => cb(s.exists() ? (s.data() as T) : null),
        (e) => onError?.(e),
      )
    },
    async exportAll() {
      const out: Dump = {}
      for (const name of COLLECTIONS) {
        const s = await fs.getDocs(col(name))
        out[name] = Object.fromEntries(s.docs.map((d) => [d.id, d.data()]))
      }
      return out
    },
    async importAll(dump) {
      for (const [name, docs] of Object.entries(dump)) {
        for (const [id, data] of Object.entries(docs)) await fs.setDoc(fs.doc(db, 'users', uid, name, id), clean(data))
      }
    },
  }
}
