import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  BaselineDoc, Bilan, ChaptersCfg, Concept, Evaluation, FlashCard, FlashProg, FlashSource, JournalEntry, StatsDoc,
} from '../domain/types'
import { useStore } from './provider'
import type { WithId } from './store'

export type StoredBilan = Bilan & { note?: string }

export interface AppData {
  ready: boolean
  concepts: Concept[]
  evals: Evaluation[]
  flash: FlashCard[]
  sources: FlashSource[]
  chcfg: ChaptersCfg
  flashProg: FlashProg
  journal: JournalEntry[]
  baselines: BaselineDoc[]
  stats: StatsDoc | null
  bilans: Record<string, StoredBilan>
}

export const emptyProg = (): FlashProg => ({ cards: {}, days: {}, xp: 0, hist: [], cascade: {} })

/** Complète les champs absents d'un document flashprog venu de la base. */
export function normProg(p: Partial<FlashProg> | null | undefined): FlashProg {
  return { cards: p?.cards ?? {}, days: p?.days ?? {}, xp: p?.xp ?? 0, hist: p?.hist ?? [], cascade: p?.cascade ?? {} }
}

const Ctx = createContext<AppData | null>(null)
export function useAppData(): AppData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppData doit être utilisé dans <AppDataProvider>')
  return v
}

type Raw<T> = WithId<T>[]

export function AppDataProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const [concepts, setConcepts] = useState<Raw<Omit<Concept, 'id'>> | null>(null)
  const [evals, setEvals] = useState<Raw<Omit<Evaluation, 'id'>> | null>(null)
  const [flash, setFlash] = useState<Raw<Omit<FlashCard, 'id'>> | null>(null)
  const [sources, setSources] = useState<Raw<Omit<FlashSource, 'id'>> | null>(null)
  const [cfg, setCfg] = useState<ChaptersCfg | null | undefined>(undefined)
  const [prog, setProg] = useState<Partial<FlashProg> | null | undefined>(undefined)
  const [journal, setJournal] = useState<Raw<{ entries?: JournalEntry[] }> | null>(null)
  const [baselines, setBaselines] = useState<Raw<Omit<BaselineDoc, 'id'>> | null>(null)
  const [stats, setStats] = useState<StatsDoc | null | undefined>(undefined)
  const [bilans, setBilans] = useState<Raw<Omit<StoredBilan, 'id'>> | null>(null)

  useEffect(() => {
    const err = (e: Error) => console.error(e)
    const offs = [
      store.subscribeCollection<Omit<Concept, 'id'>>('concepts', setConcepts, err),
      store.subscribeCollection<Omit<Evaluation, 'id'>>('evals', setEvals, err),
      store.subscribeCollection<Omit<FlashCard, 'id'>>('flash', setFlash, err),
      store.subscribeCollection<Omit<FlashSource, 'id'>>('sources', setSources, err),
      store.subscribeDoc<ChaptersCfg>('flashcfg/chapters', setCfg, err),
      store.subscribeDoc<FlashProg>('flashprog/main', setProg, err),
      store.subscribeCollection<{ entries?: JournalEntry[] }>('journal', setJournal, err),
      store.subscribeCollection<Omit<BaselineDoc, 'id'>>('baseline', setBaselines, err),
      store.subscribeDoc<StatsDoc>('stats/main', setStats, err),
      store.subscribeCollection<Omit<StoredBilan, 'id'>>('bilans', setBilans, err),
    ]
    return () => offs.forEach((o) => o())
  }, [store])

  const value = useMemo<AppData>(() => {
    const ready = [concepts, evals, flash, sources, journal, baselines, bilans].every((x) => x !== null) && cfg !== undefined && prog !== undefined && stats !== undefined
    return {
      ready,
      concepts: (concepts ?? []) as Concept[],
      evals: (evals ?? []) as Evaluation[],
      flash: (flash ?? []) as FlashCard[],
      sources: (sources ?? []) as FlashSource[],
      chcfg: cfg ?? {},
      flashProg: normProg(prog),
      journal: (journal ?? []).flatMap((d) => d.entries ?? []),
      baselines: (baselines ?? []) as unknown as BaselineDoc[],
      stats: stats ?? null,
      bilans: Object.fromEntries((bilans ?? []).map((b) => [b.id, b as unknown as StoredBilan])),
    }
  }, [concepts, evals, flash, sources, cfg, prog, journal, baselines, stats, bilans])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
