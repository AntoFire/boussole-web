import { useCallback } from 'react'
import { useToast } from '../../components/Toast'
import { useAppData } from '../../data/appData'
import { useStore } from '../../data/provider'
import { addDays, today } from '../../domain/dates'
import { FL_PASS, cardStateAfter } from '../../domain/flash'
import { statsAdd, statsPrune } from '../../domain/stats'
import type { CourseKey } from '../../domain/types'
import type { DrillResult } from './Drill'

/** Enregistre une série Flash (bloc d'un chapitre ou révision des erreurs) : Leitner, jour, historique, cascade, notions liées. */
export function useRecordFlash() {
  const d = useAppData()
  const store = useStore()
  const toast = useToast()
  return useCallback(
    async (results: DrillResult[], block?: { course: CourseKey; ch: number }) => {
      const day = today()
      const prog = d.flashProg
      const n = results.length
      if (!n) return
      const ok = results.filter((r) => r.ok).length
      try {
        const cards = { ...prog.cards }
        for (const r of results) cards[r.card.id] = cardStateAfter(cards[r.card.id], r.ok, day)
        const next = { ...prog, cards, days: { ...prog.days, [day]: (prog.days[day] ?? 0) + n }, xp: prog.xp + ok * 10 }
        const byCourse = new Map<CourseKey, DrillResult[]>()
        for (const r of results) byCourse.set(r.card.course, [...(byCourse.get(r.card.course) ?? []), r])
        let stats = d.stats
        for (const [c, rs] of byCourse) {
          const cok = rs.filter((r) => r.ok).length
          next.hist = [...next.hist, { d: day, n: rs.length, ok: cok, c }].slice(-200)
          stats = statsAdd(stats, day, c, rs.length, cok, rs.reduce((a, r) => a + r.ms, 0))
        }
        if (block) {
          const p = Math.round((ok / n) * 100)
          next.cascade = { ...next.cascade, [block.course]: { ...(next.cascade[block.course] ?? {}), [String(block.ch)]: { p, ok: p >= FL_PASS * 100, d: day } } }
        }
        for (const r of results) {
          const c = !r.ok && r.card.concept ? d.concepts.find((x) => x.id === r.card.concept) : undefined
          if (c && c.status !== 'consolide') await store.updateDoc(`concepts/${c.id}`, { nextDue: addDays(day, 1) })
        }
        await store.setDoc('flashprog/main', next)
        await store.setDoc('stats/main', statsPrune(stats!, day))
      } catch (e) {
        toast('Enregistrement impossible : ' + (e as Error).message)
      }
    },
    [d, store, toast],
  )
}
