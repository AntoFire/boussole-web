import { clean, splitPath, type DataStore, type Dump, type Unsubscribe, type WithId } from './store'

export const LOCAL_KEY = 'boussole.v2.data'

type Listener = () => void

/** Backend local : données en mémoire, persistées dans localStorage. Sert au développement, aux tests et à la démo. */
export class LocalStore implements DataStore {
  readonly kind = 'local' as const
  private data: Dump
  private listeners = new Set<Listener>()
  private storage: Pick<Storage, 'getItem' | 'setItem'> | null

  constructor(
    initial: Dump = {},
    storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null,
  ) {
    this.storage = storage
    this.data = clean(initial)
  }

  /** Charge les données persistées ; au tout premier lancement, part du seed (public/seed.json). */
  static async create(seedUrl = '/seed.json'): Promise<LocalStore> {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LOCAL_KEY) : null
      if (saved) return new LocalStore(JSON.parse(saved) as Dump)
    } catch {
      /* stockage illisible : on repart du seed */
    }
    let seed: Dump = {}
    try {
      const r = await fetch(seedUrl)
      if (r.ok) seed = (await r.json()) as Dump
    } catch {
      /* pas de seed : base vide */
    }
    const s = new LocalStore(seed)
    s.persist()
    return s
  }

  static reset(): void {
    try {
      localStorage.removeItem(LOCAL_KEY)
    } catch {
      /* ignoré */
    }
  }

  private persist(): void {
    try {
      this.storage?.setItem(LOCAL_KEY, JSON.stringify(this.data))
    } catch {
      /* quota ou stockage indisponible : les données restent en mémoire */
    }
  }
  private emit(): void {
    this.persist()
    for (const l of [...this.listeners]) l()
  }

  async getDoc<T>(path: string): Promise<T | null> {
    const [c, id] = splitPath(path)
    const d = this.data[c]?.[id]
    return d === undefined ? null : (clean(d) as T)
  }
  async setDoc(path: string, data: object): Promise<void> {
    const [c, id] = splitPath(path)
    this.data[c] = { ...(this.data[c] ?? {}), [id]: clean(data) }
    this.emit()
  }
  async updateDoc(path: string, patch: object): Promise<void> {
    const [c, id] = splitPath(path)
    const prev = (this.data[c]?.[id] as object | undefined) ?? {}
    this.data[c] = { ...(this.data[c] ?? {}), [id]: { ...prev, ...clean(patch) } }
    this.emit()
  }
  async deleteDoc(path: string): Promise<void> {
    const [c, id] = splitPath(path)
    if (!this.data[c] || !(id in this.data[c])) return
    const { [id]: _removed, ...rest } = this.data[c]
    void _removed
    this.data[c] = rest
    this.emit()
  }

  private watch(read: () => void): Unsubscribe {
    let alive = true
    const l: Listener = () => alive && read()
    this.listeners.add(l)
    queueMicrotask(l)
    return () => {
      alive = false
      this.listeners.delete(l)
    }
  }
  subscribeCollection<T>(name: string, cb: (docs: WithId<T>[]) => void): Unsubscribe {
    return this.watch(() => {
      const col = this.data[name] ?? {}
      cb(Object.entries(col).map(([id, d]) => ({ id, ...(clean(d) as T) })))
    })
  }
  subscribeDoc<T>(path: string, cb: (data: T | null) => void): Unsubscribe {
    const [c, id] = splitPath(path)
    return this.watch(() => {
      const d = this.data[c]?.[id]
      cb(d === undefined ? null : (clean(d) as T))
    })
  }

  async exportAll(): Promise<Dump> {
    return clean(this.data)
  }
  /** Comme Firestore : remplace les documents de même identifiant, garde les autres. */
  async importAll(dump: Dump): Promise<void> {
    for (const [c, docs] of Object.entries(clean(dump))) this.data[c] = { ...(this.data[c] ?? {}), ...docs }
    this.emit()
  }
}
