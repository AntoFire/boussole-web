/** Compteurs d'appels d'un utilisateur (document aiUsage/{uid}, écrit uniquement par le serveur). */
export interface Usage {
  /** début de la fenêtre d'une minute (ms) */
  minStart: number
  minCount: number
  /** jour AAAA-MM-JJ dans le fuseau du quota */
  day: string
  dayCount: number
}

export interface Limits {
  perMin: number
  perDay: number
}

export type UsageDecision = { ok: true; usage: Usage } | { ok: false; reason: 'minute' | 'day'; retryAfterSec: number }

/** Réserve un appel : renvoie les nouveaux compteurs, ou le motif du refus. Pur, donc testable. */
export function reserveCall(prev: Usage | undefined, nowMs: number, day: string, lim: Limits): UsageDecision {
  const sameMin = !!prev && nowMs - prev.minStart < 60_000
  const minStart = sameMin ? prev.minStart : nowMs
  const minCount = sameMin ? prev.minCount : 0
  const dayCount = prev && prev.day === day ? prev.dayCount : 0
  if (dayCount >= lim.perDay) return { ok: false, reason: 'day', retryAfterSec: 3600 }
  if (minCount >= lim.perMin) return { ok: false, reason: 'minute', retryAfterSec: Math.max(1, Math.ceil((minStart + 60_000 - nowMs) / 1000)) }
  return { ok: true, usage: { minStart, minCount: minCount + 1, day, dayCount: dayCount + 1 } }
}

/** Jour AAAA-MM-JJ dans un fuseau donné. */
export function dayKey(nowMs: number, tz: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(new Date(nowMs))
}
