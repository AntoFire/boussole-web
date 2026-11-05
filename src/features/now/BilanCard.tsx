import { useState } from 'react'
import { useToast } from '../../components/Toast'
import { useAppData } from '../../data/appData'
import { useStore } from '../../data/provider'
import { bilanBuild, bilanView } from '../../domain/bilan'
import { addDays, today } from '../../domain/dates'
import { eveningMode } from '../../domain/eveningMode'
import { streak } from '../../domain/flash'
import { missedToday, tomorrowList } from '../bilanInput'

export function BilanCard({ now }: { now: Date }) {
  const d = useAppData()
  const store = useStore()
  const toast = useToast()
  const day = today(now)
  const mode = eveningMode(now)
  const view = bilanView(mode)
  const saved = d.bilans[day]
  const [note, setNote] = useState(saved?.note ?? '')
  const [force, setForce] = useState(false)
  const visible = now.getHours() >= 19 || force || !!saved
  if (view.closed) return null
  if (!visible)
    return (
      <div className="card row" style={{ justifyContent: 'space-between' }}>
        <span className="muted">Bilan du soir disponible dès 19 h.</span>
        <button className="btn small" onClick={() => setForce(true)}>Voir maintenant</button>
      </div>
    )
  const b = bilanBuild(
    {
      stats: d.stats, baselines: d.baselines, cascade: d.flashProg.cascade, cards: d.flashProg.cards,
      streak: streak(d.flashProg.days, day),
      missed: missedToday(d.flashProg.cards, d.flash, day),
      tomorrow: tomorrowList(d.concepts, d.evals, addDays(day, 1)),
    },
    day,
  )
  const save = async () => {
    try {
      await store.setDoc(`bilans/${day}`, { ...b, note })
      toast('Bilan enregistré')
    } catch (e) {
      toast('Enregistrement impossible : ' + (e as Error).message)
    }
  }
  const diff = (a: number | null, p: number | null | undefined) => (a !== null && p != null ? ` (${a - p >= 0 ? '+' : ''}${a - p} vs hier)` : '')
  return (
    <div className="card stack-sm">
      <div className="eyebrow">Bilan du soir{mode === 'readonly' ? ' · lecture seule' : ''}</div>
      <div className="kpis">
        <div><b>{b.cards}</b><span>cartes{b.prev ? ` (hier ${b.prev.cards})` : ''}</span></div>
        <div><b>{b.pct ?? '—'}{b.pct !== null ? ' %' : ''}</b><span>justes{diff(b.pct, b.prev?.pct)}</span></div>
        <div><b>{Math.round(b.mins)}</b><span>min actives{b.prev ? ` (hier ${Math.round(b.prev.mins)})` : ''}</span></div>
        <div><b>{b.wins.length}</b><span>victoires</span></div>
      </div>
      {b.byCourse.map((r) => (
        <div key={r.course} className="small"><b>{r.course}</b> : T0 {r.t0} % → {r.now} % {r.delta !== null && <span className="tag">{r.delta >= 0 ? '+' : ''}{r.delta} pts</span>}</div>
      ))}
      {b.wins.length > 0 && <div><div className="eyebrow">Micro-victoires</div><ul className="fiche">{b.wins.map((w) => <li key={w}>{w}</li>)}</ul></div>}
      {b.stuck.length > 0 && <div><div className="eyebrow">Ce qui a coincé</div><ul className="fiche">{b.stuck.map((w) => <li key={w}>{w}</li>)}</ul></div>}
      {view.showTomorrow && b.tomorrow.length > 0 && <div><div className="eyebrow">3 pistes pour demain</div><ul className="fiche">{b.tomorrow.map((w) => <li key={w}>{w}</li>)}</ul></div>}
      {view.showNote && <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Une ligne pour toi (facultatif)" aria-label="Note libre" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)' }} />}
      {view.showSave && <div className="row"><button className="btn primary" onClick={() => void save()}>{saved ? 'Mettre à jour' : 'Enregistrer le bilan'}</button></div>}
    </div>
  )
}
