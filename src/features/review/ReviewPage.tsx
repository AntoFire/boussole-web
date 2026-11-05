import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chip } from '../../components/Chip'
import { useAppData } from '../../data/appData'
import { chLabel } from '../../domain/chapters'
import { fmtRel, today } from '../../domain/dates'
import { isDue, conceptCh } from '../../domain/priority'
import { STATUS_LABEL } from '../../domain/notion'
import { COURSE_KEYS, type Concept } from '../../domain/types'
import { ConceptSheet } from './ConceptSheet'

export function ReviewPage() {
  const { concepts, flash, sources, chcfg } = useAppData()
  const [params, setParams] = useSearchParams()
  const openId = params.get('c')
  const setOpenId = (id: string | null) => {
    const p = new URLSearchParams(params)
    if (id) p.set('c', id)
    else p.delete('c')
    setParams(p, { replace: !id })
  }
  const [onlyDue, setOnlyDue] = useState(false)
  const t = today()
  const open = concepts.find((c) => c.id === openId) ?? null
  const groups = useMemo(
    () =>
      COURSE_KEYS.map((course) => {
        const list = concepts.filter((c) => c.course === course && (!onlyDue || isDue(c, t)))
        const chs = [...new Set(list.map(conceptCh))].sort((a, b) => a - b)
        return { course, chs: chs.map((n) => ({ n, items: list.filter((c) => conceptCh(c) === n).sort((a, b) => a.name.localeCompare(b.name)) })) }
      }).filter((g) => g.chs.length),
    [concepts, onlyDue, t],
  )
  const row = (c: Concept) => (
    <button key={c.id} className="crow" onClick={() => setOpenId(c.id)}>
      <span className={`status-dot s-${c.status}`} title={STATUS_LABEL[c.status]} />
      <span>
        <span className="nm">{c.name}</span>
        <span className="meta"><span className="tag">{STATUS_LABEL[c.status]}</span></span>
      </span>
      <span className="due">{c.status === 'consolide' ? '✓' : c.nextDue ? fmtRel(c.nextDue, t) : '—'}</span>
    </button>
  )
  return (
    <div className="stack">
      <div className="page-head">
        <h1>Réviser</h1>
        <div className="seg" role="group" aria-label="Filtre">
          <button aria-pressed={!onlyDue} onClick={() => setOnlyDue(false)}>Tout</button>
          <button aria-pressed={onlyDue} onClick={() => setOnlyDue(true)}>À faire</button>
        </div>
      </div>
      {groups.map((g) => (
        <section key={g.course}>
          <div className="group-title"><Chip course={g.course} /></div>
          <div className="clist">
            {g.chs.map((ch) => (
              <div key={ch.n}>
                <div className="ch-head"><span>{chLabel(g.course, ch.n, chcfg, flash, sources)}</span><span>{ch.items.length}</span></div>
                {ch.items.map(row)}
              </div>
            ))}
          </div>
        </section>
      ))}
      {!groups.length && <div className="empty">Rien à réviser pour l’instant.</div>}
      {open && <ConceptSheet concept={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}
