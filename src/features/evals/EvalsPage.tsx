import { Chip } from '../../components/Chip'
import { useAppData } from '../../data/appData'
import { addDays, dayDiff, fmtDay, parseDay, today } from '../../domain/dates'

const monday = (s: string) => addDays(s, -((parseDay(s).getDay() + 6) % 7))

export function EvalsPage() {
  const { evals } = useAppData()
  const t = today()
  const sorted = [...evals].sort((a, b) => a.at.localeCompare(b.at))
  const weeks = new Map<string, typeof sorted>()
  for (const e of sorted) {
    const k = monday(e.at.slice(0, 10))
    weeks.set(k, [...(weeks.get(k) ?? []), e])
  }
  return (
    <div className="stack">
      <div className="page-head"><h1>Échéances</h1></div>
      {[...weeks].map(([wk, list]) => {
        const w = list.reduce((s, e) => s + e.weight, 0)
        const past = dayDiff(addDays(wk, 6), t) < 0
        return (
          <section key={wk} className="week" style={past ? { opacity: 0.6 } : undefined}>
            <div className="week-h">
              <h3>Semaine du {fmtDay(wk)}</h3>
              <span className="heat" style={{ background: w >= 30 ? 'var(--red-soft)' : w >= 15 ? 'var(--amber-soft)' : 'var(--sunk)' }}>{w} %</span>
            </div>
            <div className="clist">
              {list.map((e) => {
                const n = dayDiff(e.at.slice(0, 10), t)
                return (
                  <div key={e.id} className={`erow ${n < 0 ? 'past' : ''}`}>
                    <span className="when">{fmtDay(e.at.slice(0, 10))}{e.at.length > 10 ? ' ' + e.at.slice(11, 16) : ''}</span>
                    <span><Chip course={e.course} /> {e.title}{e.mode ? <span className="muted small"> · {e.mode}</span> : null}</span>
                    <span className="w">{e.weight} %</span>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
      {!evals.length && <div className="empty">Aucune échéance.</div>}
    </div>
  )
}
