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
