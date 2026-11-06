export type Unsubscribe = () => void
export type WithId<T> = T & { id: string }
export type Dump = Record<string, Record<string, unknown>>

/** Collections de Boussole (les mêmes que l'artifact). */
export const KNOWN_COLLECTIONS = [
  'concepts', 'evals', 'flash', 'sources', 'flashcfg', 'flashprog', 'journal', 'baseline', 'stats', 'bilans',
  'chprog', 'rewards', 'exam', 'examrun', 'exambank', 'exampm',
] as const

/** Accès aux données. Les chemins sont de la forme « collection/id ». */
export interface DataStore {
  readonly kind: 'local' | 'firebase'
  getDoc<T>(path: string): Promise<T | null>
  setDoc(path: string, data: object): Promise<void>
  updateDoc(path: string, patch: object): Promise<void>
  deleteDoc(path: string): Promise<void>
  subscribeCollection<T>(name: string, cb: (docs: WithId<T>[]) => void, onError?: (e: Error) => void): Unsubscribe
  subscribeDoc<T>(path: string, cb: (data: T | null) => void, onError?: (e: Error) => void): Unsubscribe
  exportAll(): Promise<Dump>
  importAll(dump: Dump): Promise<void>
}

export function splitPath(path: string): [string, string] {
  const i = path.indexOf('/')
  if (i <= 0 || i === path.length - 1) throw new Error(`Chemin invalide : « ${path} » (attendu collection/id)`)
  return [path.slice(0, i), path.slice(i + 1)]
}

/** Retire les `undefined` (non acceptés par Firestore) et copie en profondeur. */
export function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}
