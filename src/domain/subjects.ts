import { chCards, chList } from './chapters'
import { addDays, dayDiff } from './dates'
import type { CascadeEntry, ChaptersCfg, ChProg, CourseKey, Evaluation, FlashCard, FlashSource, BlankRun } from './types'

/** Matières affichées dans la colonne de gauche (STT : reprise à l'été 2027, contenu via Maths). */
export const SUBJ: CourseKey[] = ['GIF', 'IFT', 'SIO', 'MATH']
export const SUBJ_LATER: Partial<Record<CourseKey, string>> = { STT: 'Reprise été 2027 · le contenu passe par Maths' }

export const LV = [
  { e: '⚪', t: 'Pas commencé' },
  { e: '🔴', t: 'Vu' },
  { e: '🟡', t: 'Compris' },
  { e: '🟢', t: 'Maîtrisé' },
  { e: '⭐', t: 'Consolidé' },
] as const

export const XP_LV = 500 // XP par niveau de matière
export const BLANK_MIN = 10 // minutes, première feuille blanche
export const BLANK_REV = 5 // minutes, feuilles blanches suivantes
export const BLANK_INT = [1, 3, 7, 16, 35] as const // calendrier après une feuille réussie
export const BLANK_PASS = 80 // seuil (%) d'une feuille blanche ou d'un quiz
export const BLANK_KEEP = 30 // essais conservés

export const BLANK_GUIDE: [string, string][] = [
  ['Quel problème ce chapitre résout-il ?', 'Pourquoi on en a besoin, la situation de départ'],
  ['Quelle formule ou quel mécanisme ?', 'La formule, ou les étapes, de tête'],
  ["À quoi ça sert, quand l'utiliser ?", "Dans quel cas on l'applique, et quand pas"],
  ['Un exemple avec de vrais nombres', 'Un petit calcul ou un cas concret'],
  ['Un piège ou une erreur classique', "Ce qu'on confond, ce qu'il ne faut pas oublier"],
]

export type NextStep = 'video' | 'blank' | 'quiz' | 'review' | 'done'
export const STEP_LABEL: Record<NextStep, string> = {
  video: '📄 Lire le cours du prof',
  blank: '📝 Feuille blanche',
  quiz: '❓ Quiz du chapitre',
  review: '📝 Feuille blanche due',
  done: 'Rien à faire',
}

export interface ChState {
  /** 0 pas commencé · 1 vu · 2 compris · 3 maîtrisé · 4 consolidé */
  lv: number
  /** niveau effectif pour les priorités (un cran de moins si la feuille est en retard) */
  eff: number
  late: boolean
  dueNow: boolean
  due: string | null
  best: number | null
  last: number | null
  qp: number | null
  q: CascadeEntry | null
  seen: boolean
  runs: BlankRun[]
  next: NextStep
  xp: number
  streak: number
}

export const chProgId = (c: CourseKey, n: number) => `${c}-${n}`

/** État d'un chapitre, d'après sa progression (`chprog`) et son dernier quiz (`flashprog.cascade`). */
export function chState(doc: Partial<ChProg> | undefined, q: CascadeEntry | null | undefined, todayStr: string): ChState {
  const runs = Array.isArray(doc?.blank) ? doc.blank.filter((r) => typeof r?.p === 'number') : []
  const best = runs.length ? Math.max(...runs.map((r) => r.p)) : null
  const last = runs.length ? runs[runs.length - 1].p : null
  const seen = !!doc?.video?.seen
  const quiz = q ?? null
  const qp = quiz && typeof quiz.p === 'number' ? quiz.p : null
  // une note par jour (la dernière du jour) ; série = feuilles réussies de suite, en partant de la plus récente
  const byDay: Record<string, number> = {}
  for (const r of runs) if (r.d) byDay[r.d] = r.p
  const days = Object.keys(byDay).sort()
  let streak = 0
  for (let i = days.length - 1; i >= 0 && byDay[days[i]] >= BLANK_PASS; i--) streak++
  let lv = 0
  if (seen || runs.length || quiz) lv = 1
  if (best != null && best >= 60) lv = 2
  if (last != null && last >= BLANK_PASS && qp != null && qp >= BLANK_PASS) lv = 3
  if (lv === 3 && streak >= 4) lv = 4
  // calendrier dès la première feuille : J+1, 3, 7, 16, 35 ; sous 80 %, retour à J+1
  let due: string | null = null
  if (days.length) {
    const ld = days[days.length - 1]
    due = addDays(ld, last! >= BLANK_PASS ? BLANK_INT[Math.min(Math.max(streak - 1, 0), BLANK_INT.length - 1)] : 1)
  } else if (seen) due = doc?.video?.d || todayStr
  const late = due != null && dayDiff(todayStr, due) > 0
  const dueNow = due != null && dayDiff(todayStr, due) >= 0
  const eff = late ? Math.max(0, lv - 1) : lv
  let next: NextStep
  if (!seen && !runs.length) next = 'video'
  else if (!runs.length) next = 'blank'
  else if (dueNow) next = 'review'
  else if (last! < BLANK_PASS) next = 'blank'
  else if (qp == null || qp < BLANK_PASS) next = 'quiz'
  else next = 'done'
  const xp = (seen ? 10 : 0) + runs.length * 30 + (qp != null && qp >= BLANK_PASS ? 20 : 0) + (lv >= 3 ? 100 : 0) + (lv >= 4 ? 200 : 0)
  return { lv, eff, late, dueNow, due, best, last, qp, q: quiz, seen, runs, next, xp, streak }
}

/** Feuille blanche guidée par défaut tant que les 3 premières ne sont pas faites ou que le meilleur score est faible. */
export const blankGuidedDefault = (st: ChState) => st.runs.length < 3 || (st.best ?? 0) < 60

export interface SubjectCtx {
  cfg: ChaptersCfg
  flash: FlashCard[]
  sources: FlashSource[]
  chprog: Record<string, Partial<ChProg>>
  cascade: Record<string, Record<string, CascadeEntry>>
  evals: Evaluation[]
  today: string
}

export interface ChRow {
  c: CourseKey
  n: number
  label: string
  fiche: string
  st: ChState
}

export function subRows(k: CourseKey, x: SubjectCtx): ChRow[] {
  return chList(k, x.cfg, x.flash, x.sources)
    .filter((ch) => ch.n !== 99)
    .map((ch) => ({ c: k, n: ch.n, label: ch.label, fiche: ch.fiche, st: chState(x.chprog[chProgId(k, ch.n)], x.cascade[k]?.[String(ch.n)], x.today) }))
}

export const subXP = (rows: ChRow[]) => rows.reduce((s, r) => s + r.st.xp, 0)
export const levelOfXP = (xp: number) => Math.floor(xp / XP_LV) + 1

export function nextEvalCourse(c: CourseKey, evals: Evaluation[], todayStr: string): Evaluation | null {
  return evals.filter((e) => e.course === c && dayDiff(e.at, todayStr) >= 0).sort((a, b) => a.at.localeCompare(b.at))[0] ?? null
}

/** Priorité d'un chapitre : niveau bas, feuille due ou en retard, évaluation proche (≤ 21 j, au prorata du poids). */
export function chPrio(c: CourseKey, st: ChState, evals: Evaluation[], todayStr: string): number {
  if (st.next === 'done') return -1
  let p = (4 - st.eff) * 10 + (st.dueNow ? 25 : 0) + (st.late && st.due ? Math.min(20, dayDiff(todayStr, st.due) * 3) : 0)
  const ev = nextEvalCourse(c, evals, todayStr)
  if (ev) {
    const dd = dayDiff(ev.at, todayStr)
    if (dd <= 21) p += ((21 - dd) * (ev.weight || 5)) / 10
  }
  return p
}

export function chReason(c: CourseKey, st: ChState, evals: Evaluation[], todayStr: string): string {
  const bits: string[] = [STEP_LABEL[st.next]]
  if (st.late) bits.push('révision en retard')
  const ev = nextEvalCourse(c, evals, todayStr)
  if (ev) {
    const dd = dayDiff(ev.at, todayStr)
    if (dd <= 21) bits.push(`${ev.title} ${dd === 0 ? "aujourd'hui" : 'dans ' + dd + ' j'}`)
  }
  return bits.join(' · ')
}

/** Les chapitres les plus utiles maintenant, toutes matières de `keys` confondues. */
export function focusList(keys: CourseKey[], x: SubjectCtx, max: number): (ChRow & { p: number })[] {
  return keys
    .flatMap((k) => subRows(k, x).map((r) => ({ ...r, p: chPrio(k, r.st, x.evals, x.today) })))
    .filter((r) => r.p >= 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, max)
}

/** Feuilles blanches à refaire aujourd'hui (la plus ancienne d'abord). */
export function dueSheets(keys: CourseKey[], x: SubjectCtx): ChRow[] {
  return keys
    .flatMap((k) => subRows(k, x))
    .filter((r) => r.st.dueNow && (r.st.runs.length > 0 || r.st.seen))
    .sort((a, b) => (a.st.due ?? '').localeCompare(b.st.due ?? ''))
}

/** Points clés de la feuille blanche : ceux enregistrés, sinon tirés des cartes de cours du chapitre. */
export function chPoints(doc: Partial<ChProg> | undefined, cards: FlashCard[]): { pts: string[]; src: 'saved' | 'cards' } {
  if (Array.isArray(doc?.points) && doc.points.length) return { pts: doc.points, src: 'saved' }
  const pts = cards
    .filter((x) => x.kind !== 'exercice' && Array.isArray(x.choices) && x.choices[x.answer] != null)
    .slice(0, 8)
    .map((x) => `${x.q} → ${x.choices[x.answer]}`)
  return { pts, src: 'cards' }
}

/** Fiche d'un chapitre : texte de la configuration, et ses supports de cours (ou ceux de la matière à défaut). */
export function chFiche(c: CourseKey, n: number, cfg: ChaptersCfg, flash: FlashCard[], sources: FlashSource[]) {
  const text = chList(c, cfg, flash, sources).find((x) => x.n === n)?.fiche ?? ''
  const own = sources.filter((s) => s.course === c && (typeof s.ch === 'number' ? s.ch : 1) === n)
  return { text, srcs: own.length ? own : sources.filter((s) => s.course === c), own }
}

/** Découpe une fiche en phrases (une puce par phrase). */
export function splitFiche(t: string): string[] {
  return String(t || '')
    .split(/(?<=[.;])\s+(?=[A-ZÀ-ÖØ-Þ0-9(«])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export const blankScore = (hit: boolean[]) => (hit.length ? Math.round((hit.filter(Boolean).length / hit.length) * 100) : 0)
export const appendRun = (runs: BlankRun[] | undefined, run: BlankRun) => [...(runs ?? []), run].slice(-BLANK_KEEP)

export { chCards }
