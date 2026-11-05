import { conceptCh, dueList } from '../domain/priority'
import { priority } from '../domain/priority'
import type { BilanInput } from '../domain/bilan'
import type { CardState, Concept, Evaluation, FlashCard } from '../domain/types'

const short = (s: string, n = 70) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

/** Cartes ratées aujourd'hui (libellés courts), les plus récemment ratées d'abord n'est pas connu : ordre de la banque. */
export function missedToday(cards: Record<string, CardState>, flash: FlashCard[], today: string): string[] {
  return flash.filter((c) => cards[c.id]?.seen === today && cards[c.id]?.last === 0).map((c) => short(c.q.split('\n')[0]))
}

/** Trois pistes pour demain : notions dues demain ou avant, par priorité. */
export function tomorrowList(concepts: Concept[], evals: Evaluation[], tomorrow: string): string[] {
  return dueList(concepts, tomorrow)
    .map((c) => ({ c, p: priority(c, evals, tomorrow) }))
    .sort((a, b) => b.p - a.p || conceptCh(a.c) - conceptCh(b.c))
    .slice(0, 3)
    .map((r) => `${r.c.name} (${r.c.course})`)
}

export type BilanSources = Pick<BilanInput, 'stats' | 'baselines' | 'cascade' | 'cards' | 'streak'>
