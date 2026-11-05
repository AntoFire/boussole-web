import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../../components/Chip'
import { useAppData } from '../../data/appData'
import { useNow } from '../../hooks/useNow'
import { dayDiff, fmtDay, today } from '../../domain/dates'
import { eveningMode } from '../../domain/eveningMode'
import { FL_GOAL, streak } from '../../domain/flash'
import { dueList, lampadaire, reason } from '../../domain/priority'
import { courseT0Now, weekDelta } from '../../domain/stats'
import { COURSE_KEYS, COURSES } from '../../domain/types'
import { SUBJ, focusList } from '../../domain/subjects'
import { DueCard, FocusRows, SubjectPills, useSubjectCtx } from '../subjects/parts'
import { BilanCard } from './BilanCard'
import { ruleOfDay } from './rules'

function Focus() {
  const [min, setMin] = useState(25)
  const [left, setLeft] = useState<number | null>(null)
  const end = useRef(0)
  const running = left !== null
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((end.current - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) { clearInterval(id); setLeft(null) }
    }, 500)
    return () => clearInterval(id)
  }, [running])
  const start = () => { end.current = Date.now() + min * 60000; setLeft(min * 60) }
  const face = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return (
    <div className="card">
      <div className="eyebrow">Bloc de focus</div>
      <div className="timer-face" aria-live="off">{face(left ?? min * 60)}</div>
      <div className="row">
        <div className="seg" role="group" aria-label="Durée">
          {[25, 45, 90].map((m) => <button key={m} aria-pressed={min === m} disabled={left !== null} onClick={() => setMin(m)}>{m}</button>)}
        </div>
        {left === null ? <button className="btn primary" onClick={start}>Démarrer</button> : <button className="btn" onClick={() => setLeft(null)}>Arrêter</button>}
      </div>
    </div>
  )
}

export function NowPage() {
  const d = useAppData()
  const sx = useSubjectCtx()
  const now = useNow()
  const t = today(now)
  const mode = eveningMode(now)
  const { lamp, after } = lampadaire(d.concepts, d.evals, t)
  const due = dueList(d.concepts, t).length
  const next = d.evals.filter((e) => dayDiff(e.at.slice(0, 10), t) >= 0).sort((a, b) => a.at.localeCompare(b.at))
  const first = next[0]
  const todayN = d.flashProg.days[t] ?? 0
  const st = streak(d.flashProg.days, t)
  const wd = weekDelta(d.stats, t)
  const rows = COURSE_KEYS.map((c) => ({ c, ...courseT0Now(c, d.baselines, d.flashProg.cascade) })).filter((r) => r.chapters > 0)

  return (
    <div className="stack">
      <SubjectPills current="now" />
      <div className="page-head"><h1>Vue d’ensemble</h1></div>
      {mode === 'closed' && <div className="banner warn">Il est tard : Boussole est fermée. Dors, tu reprendras demain.</div>}
      {mode === 'readonly' && <div className="banner warn">Zone de repos : pas de travail de cours maintenant. Les chiffres restent visibles, rien à faire.</div>}
      {first && (
        <div className="card deadline">
          <div className="countdown">J-{dayDiff(first.at.slice(0, 10), t)}<small>prochaine éval</small></div>
          <div><b>{first.title}</b><div className="muted small"><Chip course={first.course} /> {fmtDay(first.at.slice(0, 10))} · {first.weight} %</div></div>
        </div>
      )}
      <div className="kpis">
        <div><b>{due}</b><span>à réviser</span></div>
        <div><b>{todayN}/{FL_GOAL}</b><span>cartes du jour</span></div>
        <div><b>{st}🔥</b><span>série</span></div>
        <div><b>{wd === null ? '—' : `${wd >= 0 ? '+' : ''}${wd}`}</b><span>pts / semaine</span></div>
      </div>
      {mode === 'full' && <DueCard keys={SUBJ} all />}
      {mode === 'full' && (
        <div className="card lift">
          <div className="eyebrow">Où concentrer tes efforts</div>
          <p className="small muted" style={{ margin: '4px 0' }}>Les 3 chapitres les plus utiles maintenant, toutes matières confondues : niveau le plus bas, révision en retard, évaluation proche.</p>
          <FocusRows list={focusList(SUBJ, sx, 3)} prefix />
        </div>
      )}
      {mode === 'full' && (
        <div className="card">
          <div className="eyebrow">Notions à revoir</div>
          {lamp ? (
            <ul className="next-steps">
              {[lamp, ...after].map((c, i) => (
                <li key={c.id}>
                  <Chip course={c.course} />
                  <div><b>{c.name}</b><div className="why">{reason(c, d.evals, t)}</div></div>
                  {i === 0 ? <Link className="btn primary" to={`/review?c=${encodeURIComponent(c.id)}`}>Ouvrir</Link> : <span />}
                </li>
              ))}
            </ul>
          ) : <div className="empty">Tout est à jour.</div>}
        </div>
      )}
      {mode === 'full' && <Link className="card fl-cta lift" to="/flash"><b>Flash du jour</b><div className="muted small">{todayN >= FL_GOAL ? 'Objectif atteint' : `Encore ${FL_GOAL - todayN} cartes pour l’objectif`}</div></Link>}
      {mode === 'full' && <Focus />}
      <div className="card stack-sm">
        <div className="eyebrow">Ta courbe : T0 → maintenant</div>
        {rows.length ? rows.map((r) => (
          <div key={r.c} className="bar2">
            <span>{COURSES[r.c].code}</span>
            <div className="tracks">
              <div className="track"><i style={{ width: `${r.t0}%`, background: `var(${COURSES[r.c].cssVar})`, opacity: 0.4 }} /></div>
              <div className="track"><i style={{ width: `${r.now}%`, background: `var(${COURSES[r.c].cssVar})` }} /></div>
            </div>
            <span className="mono">{r.t0} → {r.now}</span>
          </div>
        )) : <p className="muted small">Fais ton test d’entrée dans Flash pour voir ta progression ici.</p>}
      </div>
      <BilanCard now={now} />
      <div className="card"><div className="eyebrow">Règle du jour</div>{ruleOfDay(t)}</div>
    </div>
  )
}
