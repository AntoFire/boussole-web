import { LOCAL_KEY, LocalStore } from './localStore'

const memStorage = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), raw: m }
}
const tick = () => new Promise((r) => setTimeout(r, 0))

describe('LocalStore', () => {
  it('setDoc puis getDoc', async () => {
    const s = new LocalStore({}, memStorage())
    await s.setDoc('concepts/a', { name: 'A', streak: 1 })
    expect(await s.getDoc('concepts/a')).toEqual({ name: 'A', streak: 1 })
    expect(await s.getDoc('concepts/zz')).toBeNull()
  })
  it('updateDoc fusionne les champs de premier niveau', async () => {
    const s = new LocalStore({ concepts: { a: { name: 'A', streak: 1 } } }, memStorage())
    await s.updateDoc('concepts/a', { streak: 2, status: 'vert' })
    expect(await s.getDoc('concepts/a')).toEqual({ name: 'A', streak: 2, status: 'vert' })
  })
  it('updateDoc crée le document s’il n’existe pas', async () => {
    const s = new LocalStore({}, memStorage())
    await s.updateDoc('concepts/n', { name: 'N' })
    expect(await s.getDoc('concepts/n')).toEqual({ name: 'N' })
  })
  it('subscribeCollection : valeur initiale puis notification à chaque écriture, avec id', async () => {
    const s = new LocalStore({ evals: { e1: { title: 'Quiz' } } }, memStorage())
    const seen: string[][] = []
    const off = s.subscribeCollection<{ title: string }>('evals', (d) => seen.push(d.map((x) => x.id)))
    await tick()
    await s.setDoc('evals/e2', { title: 'Exam' })
    expect(seen).toEqual([['e1'], ['e1', 'e2']])
    off()
    await s.setDoc('evals/e3', { title: 'X' })
    expect(seen).toHaveLength(2)
  })
  it('collection vide : []', async () => {
    const s = new LocalStore({}, memStorage())
    let got: unknown = null
    s.subscribeCollection('nothing', (d) => (got = d))
    await tick()
    expect(got).toEqual([])
  })
  it('subscribeDoc : null si absent puis valeur après écriture', async () => {
    const s = new LocalStore({}, memStorage())
    const seen: unknown[] = []
    s.subscribeDoc('flashprog/main', (d) => seen.push(d))
    await tick()
    await s.setDoc('flashprog/main', { xp: 10 })
    expect(seen).toEqual([null, { xp: 10 }])
  })
  it('persiste dans le stockage', async () => {
    const st = memStorage()
    const s = new LocalStore({}, st)
    await s.setDoc('stats/main', { days: {} })
    expect(JSON.parse(st.raw.get(LOCAL_KEY)!)).toEqual({ stats: { main: { days: {} } } })
  })
  it('deleteDoc, exportAll, importAll', async () => {
    const s = new LocalStore({ concepts: { a: { n: 1 }, b: { n: 2 } } }, memStorage())
    await s.deleteDoc('concepts/a')
    expect(await s.exportAll()).toEqual({ concepts: { b: { n: 2 } } })
    await s.importAll({ evals: { e: { t: 1 } }, concepts: { b: { n: 3 }, c: { n: 4 } } })
    expect(await s.exportAll()).toEqual({ concepts: { b: { n: 3 }, c: { n: 4 } }, evals: { e: { t: 1 } } })
  })
  it('les documents lus sont des copies (pas de mutation involontaire)', async () => {
    const s = new LocalStore({ concepts: { a: { n: 1 } } }, memStorage())
    const d = (await s.getDoc<{ n: number }>('concepts/a'))!
    d.n = 99
    expect(await s.getDoc('concepts/a')).toEqual({ n: 1 })
  })
  it('chemin invalide : erreur explicite', async () => {
    const s = new LocalStore({}, memStorage())
    await expect(s.getDoc('sanschemin')).rejects.toThrow(/Chemin invalide/)
  })
})
