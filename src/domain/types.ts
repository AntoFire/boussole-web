import type { Fiche } from '../ai/types'

export type CourseKey = 'STT' | 'GIF' | 'IFT' | 'SIO' | 'MATH' | 'BASES'
export type Status = 'rouge' | 'jaune' | 'vert' | 'consolide'

export interface Mission {
  t: string
  done?: boolean
}

export interface Concept {
  id: string
  name: string
  course: CourseKey
  ch?: number
  linked?: CourseKey[]
  diffType?: string
  status: Status
  streak?: number
  lastReview?: string
  nextDue?: string
  evalId?: string
  lab?: string
  plain?: string
  history?: unknown[]
  missions?: Mission[]
  contact?: number
  source?: string
  keyIdeas?: string
}

export interface Evaluation {
  id: string
  course: CourseKey
  title: string
  /** YYYY-MM-DD ou YYYY-MM-DDTHH:MM */
  at: string
  weight: number
  mode?: string
  note?: string
}

export type CardKind = 'formule' | 'concept' | 'exercice' | 'vf'

export interface FlashCard {
  id: string
  course: CourseKey
  kind: CardKind
  concept?: string
  q: string
  choices: string[]
  answer: number
  why?: string
  src?: string
  ch?: number
  gen?: boolean
  flagged?: boolean
  created?: string
}

export interface FlashSource {
  id: string
  course: CourseKey
  title: string
  url: string
  fiche?: string
  ch?: number
}

export interface CardState {
  box: number
  due?: string
  seen?: string
  last?: 0 | 1
  n?: number
  ok?: number
}

export interface CascadeEntry {
  p: number
  ok: boolean
  d: string
}

export interface HistEntry {
  d: string
  n: number
  ok: number
  c: string
  kind?: string
}

export interface FlashProg {
  cards: Record<string, CardState>
  days: Record<string, number>
  xp: number
  hist: HistEntry[]
  cascade: Record<string, Record<string, CascadeEntry>>
}

export interface JournalEntry {
  d: string
  concept: string
  score: number
  hints?: number
  errType?: string
  q?: string
}

export interface ChapterCfg {
  n: number
  label?: string
  fiche?: string
}
export type ChaptersCfg = Partial<Record<CourseKey, { chapters: ChapterCfg[] }>>

/** Cours vu : résumé en une phrase, vidéo perso éventuelle. */
export interface VideoInfo {
  url?: string
  sum?: string
  seen?: boolean
  d?: string
}
/** Vidéo de renfort proposée par le scan (ou « aucune »). */
export interface VideoSugg {
  url?: string
  title?: string
  channel?: string
  mins?: number
  why?: string
  checked?: string
  none?: boolean
}
export interface BlankRun {
  d: string
  p: number
  loops?: number
}
/** Progression d'un chapitre : document `chprog/{COURSE}-{n}`. */
export interface ChProg {
  course: CourseKey
  ch: number
  video?: VideoInfo
  videoSugg?: VideoSugg
  points?: string[]
  blank?: BlankRun[]
  read?: Record<string, unknown>
  /** Fiche de révision générée par l'IA, enregistrée après relecture. */
  aiFiche?: AiFiche
}

/** Fiche IA d'un chapitre : une partie par lot de pages du cours. */
export interface AiFiche {
  /** cours d'origine (document `cdocs`) */
  docId: string
  model: string
  created: string
  parts: { pages: string; fiche: Fiche }[]
}

/** Cours importé (PDF) : métadonnées. Le texte est dans `cdocchunks/{docId}-{n}`. */
export interface CDoc {
  course: CourseKey
  ch: number
  name: string
  pages: number
  chars: number
  chunks: number
  created: string
}
export interface CDocChunk {
  docId: string
  n: number
  p1: number
  p2: number
  text: string
}
export interface Reward {
  t: string
  k: CourseKey | 'ALL'
  lvl: number
}
export interface RewardsDoc {
  items: Reward[]
}

export interface BaselineRun {
  d: string
  p: number
  n: number
  ok: number
  mins: number
  cardIds: string[]
  reduced?: boolean
}
export interface BaselineDoc {
  course: CourseKey
  ch: number
  runs: BaselineRun[]
}

export interface DayStats {
  cards: number
  ok: number
  mins: number
  byCourse: Partial<Record<CourseKey, { n: number; ok: number; mins: number }>>
}
export interface StatsDoc {
  days: Record<string, DayStats>
}

export interface Bilan {
  day: string
  cards: number
  ok: number
  pct: number | null
  mins: number
  prev: { cards: number; ok: number; pct: number | null; mins: number } | null
  byCourse: { course: CourseKey; t0: number | null; now: number | null; delta: number | null }[]
  wins: string[]
  stuck: string[]
  tomorrow: string[]
}

export const COURSES: Record<CourseKey, { code: string; name: string; cssVar: string }> = {
  STT: { code: 'STT-7125', name: 'Régression', cssVar: '--stt' },
  GIF: { code: 'GIF-7005', name: 'Apprentissage auto.', cssVar: '--gif' },
  IFT: { code: 'IFT-7022', name: 'NLP', cssVar: '--ift' },
  SIO: { code: 'SIO-6051', name: 'Data mining', cssVar: '--sio' },
  MATH: { code: 'MATHS', name: 'Parcours maths', cssVar: '--math' },
  BASES: { code: 'BASES', name: 'Briques fondamentales', cssVar: '--bases' },
}
export const COURSE_KEYS = Object.keys(COURSES) as CourseKey[]
