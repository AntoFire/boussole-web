import { addDays } from './dates'
import type { Concept, Mission, Status } from './types'

export const INTERVALS = [1, 3, 7, 16] as const

export const LEVELS = {
  1: { k: 'Mécanismes', t: 'comprendre les 2-3 mécanismes principaux' },
  2: { k: 'Blocages', t: 'résoudre les blocages et exceptions notés la dernière fois' },
  3: { k: 'Liens', t: 'relier la notion aux autres chapitres et cours' },
  4: { k: 'Examen', t: "conditions d'examen, détails compris" },
} as const

export const STATUS_LABEL: Record<Status, string> = {
  rouge: 'À retravailler',
  jaune: 'Fragile',
  vert: 'Acquis',
  consolide: 'Consolidé',
}

export interface ScoreResult {
  streak: number
  status: Status
  nextDue: string
  lastReview: string
}

/** Applique une note (0-100) à une notion : série, statut, prochaine révision. */
export function applyScore(c: Pick<Concept, 'streak'>, score: number, todayStr: string): ScoreResult {
  let streak = c.streak ?? 0
  let status: Status
  let nextDue: string
  if (score >= 85) {
    streak += 1
    status = streak >= 3 ? 'consolide' : 'vert'
    nextDue = addDays(todayStr, INTERVALS[Math.min(streak, 3)])
  } else if (score >= 60) {
    streak = 0
    status = 'jaune'
    nextDue = addDays(todayStr, 1)
  } else {
    streak = 0
    status = 'rouge'
    nextDue = addDays(todayStr, 1)
  }
  return { streak, status, nextDue, lastReview: todayStr }
}

/** Nombre de points de contact déjà faits sur la notion. */
export function contactOf(c: Pick<Concept, 'contact' | 'history' | 'streak'>): number {
  if (typeof c.contact === 'number') return c.contact
  return (c.history ?? []).length ? Math.max(1, (c.streak ?? 0) + 1) : 0
}
export function levelOf(c: Pick<Concept, 'contact' | 'history' | 'streak'>): 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(1, contactOf(c))) as 1 | 2 | 3 | 4
}
export function stageLabel(c: Pick<Concept, 'contact' | 'history' | 'streak'>): string {
  const n = contactOf(c)
  return n === 0 ? 'À découvrir' : `R${Math.min(n, 4)}${n > 4 ? '+' : ''} · ${LEVELS[levelOf(c)].k}`
}
export const openMissions = (c: Pick<Concept, 'missions'>): Mission[] => (c.missions ?? []).filter((m) => !m.done)
