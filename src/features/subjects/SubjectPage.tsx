import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { useAppData } from '../../data/appData'
import { useStore } from '../../data/provider'
import { dayDiff, fmtDay, fmtRel, today } from '../../domain/dates'
import { priority, reason } from '../../domain/priority'
import {
  LV, SUBJ, SUBJ_LATER, XP_LV, focusList, levelOfXP, subRows, subXP,
} from '../../domain/subjects'
import { COURSES, type CourseKey, type Reward } from '../../domain/types'
import { DueCard, FocusRows, LvBadge, SubjectPills, useChapterLink, useSubjectCtx } from './parts'

const LEVELS_OFFERED = [2, 3, 4, 5, 6, 8, 10]

export function SubjectPage() {
  const { k = '' } = useParams()
  const key = k.toUpperCase() as CourseKey
  const d = useAppData()
  const store = useStore()
  const toast = useToast()
  const x = useSubjectCtx()
  const href = useChapterLink()
  const [rwT, setRwT] = useState('')
  const [rwL, setRwL] = useState(2)
  const C = COURSES[key]
  if (!C) return <Navigate to="/" replace />

  if (SUBJ_LATER[key])
    return (
      <div className="stack">
        <SubjectPills current={key} />
        <div className="page-head">
          <div>
            <div className="eyebrow">{C.code}</div>
            <h1>{C.name}</h1>
            <p>{SUBJ_LATER[key]}. Cet automne, tu restes inscrit et tu fais ta part du devoir d’équipe ; le travail de fond se fait dans la matière Maths.</p>
          </div>
        </div>
        <Link className="btn primary" to="/m/MATH" style={{ alignSelf: 'flex-start' }}>Aller à Maths</Link>
      </div>
    )
  if (!SUBJ.includes(key)) return <Navigate to="/" replace />

  const t = today()
  const rows = subRows(key, x)
  const xp = subXP(rows)
  const lvl = levelOfXP(xp)
  const into = xp % XP_LV
  const cnt = [0, 0, 0, 0, 0]
  rows.forEach((r) => cnt[r.st.lv]++)
  const evs = d.evals.filter((e) => e.course === key && dayDiff(e.at, t) >= 0).sort((a, b) => a.at.localeCompare(b.at))
  const ev = evs[0]
  const notions = d.concepts
    .filter((c) => c.course === key && c.status !== 'consolide')
    .map((c) => ({ c, p: priority(c, d.evals, t) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 6)
    .map((r) => r.c)
  const rw = d.rewards.map((r, i) => ({ ...r, i })).filter((r) => r.k === key || r.k === 'ALL')

  const saveRewards = async (items: Reward[]) => {
    try {
      await store.setDoc('rewards/main', { items })
    } catch {
      toast('Récompense non enregistrée (réseau)')
    }
  }

  return (
    <div className="stack">
      <SubjectPills current={key} />
      <div className="page-head subj-head" style={{ ['--c' as string]: `var(${C.cssVar})` }}>
        <div>
          <div className="eyebrow">{C.code}</div>
          <h1>{C.name}</h1>
          <p>
            Chaque chapitre passe par 3 étapes : 📄 comprendre avec le cours du prof, 📝 feuille blanche (tout écrire de tête, puis cocher les points retrouvés), ❓ quiz. Le niveau du chapitre monte à chaque étape réussie.
          </p>
        </div>
        <div className="lvl-box">
          <div className="lvl-n"><span className="mono">Niv. {lvl}</span><small className="mono">{xp} XP</small></div>
          <div className="progress" style={{ marginTop: 8 }} aria-label={`Progression vers le niveau ${lvl + 1}`}>
            <i style={{ width: `${Math.round((into / XP_LV) * 100)}%`, background: 'var(--c)' }} />
          </div>
          <div className="small muted mono" style={{ marginTop: 4 }}>{XP_LV - into} XP avant le niveau {lvl + 1}</div>
        </div>
      </div>
      <div className="lv-count">
        {LV.map((l, i) => (
          <span key={i}><span className={`lvb lv${i}`}>{l.e}</span><b className="mono">{cnt[i]}</b> {l.t.toLowerCase()}</span>
        ))}
      </div>
      <div className="grid2">
        <div className="stack">
          <DueCard keys={[key]} />
          <div className="card lift">
            <div className="eyebrow">Où concentrer tes efforts</div>
            <FocusRows list={focusList([key], x, 3)} />
          </div>
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="eyebrow">Carte des chapitres</div>
              <span className="small muted mono">{rows.length} chap.</span>
            </div>
            {rows.length ? (
              <div className="chmap">
                {rows.map((r) => {
                  const st = r.st
                  const q = st.qp
                  return (
                    <Link key={r.n} className="chrow" to={href(key, r.n)}>
                      <LvBadge st={st} />
                      <span className="ch-main">
                        <span className="ch-t">{r.label}</span>
                        <span className="ch-sub">
                          {LV[st.lv].t}
                          {st.late ? <> · <b className="late">feuille blanche en retard</b></> : st.dueNow ? <> · <b className="late">feuille blanche due</b></> : st.due ? ` · feuille blanche ${fmtRel(st.due, t)}` : ''}
                        </span>
                      </span>
                      <span className="ch-steps">
                        <span className={`cs ${st.seen ? 'on' : ''}`} title="Cours lu">📄</span>
                        <span className={`cs ${st.best != null ? (st.last! >= 80 ? 'on' : 'mid') : ''}`} title="Feuille blanche">📝<small className="mono">{st.last != null ? st.last + '%' : '—'}</small></span>
                        <span className={`cs ${q != null ? (q >= 80 ? 'on' : 'mid') : ''}`} title="Quiz">❓<small className="mono">{q != null ? q + '%' : '—'}</small></span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="small muted" style={{ margin: '8px 0 0' }}>Pas encore de chapitre pour cette matière.</p>
            )}
            <p className="small muted" style={{ margin: '12px 0 0' }}>
              🟢 Maîtrisé = feuille blanche ≥ 80 % <b>et</b> quiz ≥ 80 %. ⭐ Consolidé = 4 feuilles blanches réussies de suite, à J+1, J+3, J+7 et J+16. Sous 80 %, la feuille blanche revient le lendemain.
            </p>
          </div>
        </div>
        <div className="stack">
          {ev && (
            <div className="card">
              <div className="eyebrow">Prochaine évaluation</div>
              <div className="deadline" style={{ marginTop: 8 }}>
                <div className="countdown mono" style={{ fontSize: 36, color: `var(${C.cssVar})` }}>J-{dayDiff(ev.at, t)}<small>{fmtDay(ev.at)}</small></div>
                <div><b>{ev.title}</b><div className="small muted">{ev.weight} % · {ev.mode ?? ''}</div></div>
              </div>
              {evs.slice(1, 4).map((e) => (
                <div key={e.id} className="row small" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 6, marginTop: 6 }}>
                  <span>{e.title}</span><span className="mono muted">{fmtDay(e.at)} · {e.weight} %</span>
                </div>
              ))}
            </div>
          )}
          <div className="card">
            <div className="eyebrow">Notions à revoir</div>
            {notions.length ? (
              <div className="clist" style={{ marginTop: 8 }}>
                {notions.map((c) => (
                  <Link key={c.id} className="crow" to={`/review?c=${encodeURIComponent(c.id)}`}>
                    <span className={`status-dot s-${c.status}`} />
                    <div><div className="nm">{c.name}</div><div className="meta small muted">{reason(c, d.evals, t)}</div></div>
                    <span className={`due mono ${c.nextDue && dayDiff(t, c.nextDue) > 0 ? 'late' : ''}`}>{c.nextDue ? fmtRel(c.nextDue, t) : ''}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="small muted" style={{ margin: '6px 0 0' }}>Aucune notion à revoir pour cette matière.</p>
            )}
          </div>
          <div className="card">
            <div className="eyebrow">Récompenses réelles</div>
            <p className="small muted" style={{ margin: '4px 0 8px' }}>Tu fixes la récompense, Boussole la débloque quand le niveau est atteint.</p>
            {rw.length ? (
              <ul className="rw">
                {rw.map((r) => {
                  const on = lvl >= r.lvl
                  return (
                    <li key={r.i} className={on ? 'on' : ''}>
                      <span>{on ? '🎁' : '🔒'} {r.t}</span>
                      <span className="row" style={{ gap: 6 }}>
                        <span className="mono small">niv. {r.lvl}</span>
                        <button className="btn ghost small" aria-label="Supprimer" onClick={() => void saveRewards(d.rewards.filter((_, j) => j !== r.i))}>✕</button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="small muted">Aucune pour l’instant.</p>
            )}
            <div className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }}>
              <input className="inp" placeholder="Ex. resto du vendredi" value={rwT} onChange={(e) => setRwT(e.target.value)} style={{ flex: 1, minWidth: 0 }} aria-label="Récompense" />
              <select className="inp" value={rwL} onChange={(e) => setRwL(+e.target.value)} style={{ width: 'auto' }} aria-label="Niveau">
                {LEVELS_OFFERED.map((n) => <option key={n} value={n}>niv. {n}</option>)}
              </select>
              <button className="btn" onClick={() => {
                if (!rwT.trim()) return toast('Écris la récompense')
                void saveRewards([...d.rewards, { t: rwT.trim(), k: key, lvl: rwL }]).then(() => { setRwT(''); toast('Récompense ajoutée') })
              }}>Ajouter</button>
            </div>
          </div>
          <div className="card">
            <div className="eyebrow">Outils</div>
            <div className="row" style={{ marginTop: 8 }}>
              <Link className="btn" to="/flash">⚡ Flash</Link>
              <Link className="btn" to="/review">Réviser</Link>
              <Link className="btn" to="/evals">Échéances</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
