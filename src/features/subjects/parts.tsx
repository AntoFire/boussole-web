import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAppData } from '../../data/appData'
import { dayDiff, today } from '../../domain/dates'
import {
  BLANK_REV, LV, SUBJ, chReason, chProgId, dueSheets, type ChRow, type ChState, type SubjectCtx,
} from '../../domain/subjects'
import { COURSES, type CourseKey } from '../../domain/types'

export function useSubjectCtx(): SubjectCtx {
  const d = useAppData()
  const t = today()
  return useMemo(
    () => ({ cfg: d.chcfg, flash: d.flash, sources: d.sources, chprog: d.chprog, cascade: d.flashProg.cascade, evals: d.evals, today: t }),
    [d.chcfg, d.flash, d.sources, d.chprog, d.flashProg.cascade, d.evals, t],
  )
}

/** Lien qui ouvre la fiche d'un chapitre par-dessus la page courante (?ch=COURSE-n). */
export function useChapterLink() {
  const [params] = useSearchParams()
  const loc = useLocation()
  return (c: CourseKey, n: number) => {
    const p = new URLSearchParams(params)
    p.set('ch', chProgId(c, n))
    return `${loc.pathname}?${p.toString()}`
  }
}

export function LvBadge({ st }: { st: ChState }) {
  const l = LV[st.lv]
  return (
    <span className={`lvb lv${st.lv}`} title={`${l.t}${st.late ? ' · à revoir' : ''}`} aria-label={l.t}>
      {l.e}
    </span>
  )
}

export function FocusRows({ list, prefix }: { list: ChRow[]; prefix?: boolean }) {
  const x = useSubjectCtx()
  const href = useChapterLink()
  if (!list.length)
    return <p className="small muted" style={{ margin: '8px 0 0' }}>Rien d’urgent : tous les chapitres commencés sont à jour.</p>
  return (
    <ol className="focus">
      {list.map((r) => (
        <li key={r.c + r.n}>
          <Link className="focus-row" to={href(r.c, r.n)}>
            <LvBadge st={r.st} />
            <span className="fr-main">
              <span className="fr-t">{prefix ? `${COURSES[r.c].code} · ` : ''}{r.label}</span>
              <span className="fr-r">{chReason(r.c, r.st, x.evals, x.today)}</span>
            </span>
            <span className="fr-go" aria-hidden="true">→</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

/** « À refaire aujourd'hui » : feuilles blanches dues, la plus ancienne d'abord. */
export function DueCard({ keys, all }: { keys: CourseKey[]; all?: boolean }) {
  const x = useSubjectCtx()
  const href = useChapterLink()
  const list = dueSheets(keys, x)
  if (!list.length)
    return (
      <div className="card">
        <div className="eyebrow">À refaire aujourd’hui</div>
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          Aucune feuille blanche due. Chaque feuille blanche faite revient ici à J+1, J+3, J+7, J+16 puis J+35 : c’est ce qui t’empêche d’oublier d’une séance à l’autre.
        </p>
      </div>
    )
  return (
    <div className="card lift" style={{ borderColor: 'var(--amber)' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="eyebrow">À refaire aujourd’hui</div>
        <span className="mono small">{list.length} feuille{list.length > 1 ? 's' : ''} · ~{list.length * BLANK_REV} min</span>
      </div>
      <p className="small muted" style={{ margin: '4px 0' }}>{BLANK_REV} minutes chacune, de tête. Commence chaque case de travail par la première de la liste.</p>
      <ol className="focus">
        {list.slice(0, 6).map((r, i) => (
          <li key={r.c + r.n}>
            <Link className="focus-row" to={href(r.c, r.n)}>
              <LvBadge st={r.st} />
              <span className="fr-main">
                <span className="fr-t">{all ? `${COURSES[r.c].code} · ` : ''}{r.label}</span>
                <span className="fr-r">
                  {r.st.runs.length
                    ? `${r.st.late && r.st.due ? `en retard de ${dayDiff(x.today, r.st.due)} j` : 'due aujourd’hui'} · dernière : ${r.st.last} %`
                    : 'première feuille blanche après le cours'}
                  {i === 0 && <b> · à faire en premier</b>}
                </span>
              </span>
              <span className="fr-go" aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ol>
      {list.length > 6 && <p className="small muted" style={{ margin: '6px 0 0' }}>+ {list.length - 6} autre{list.length - 6 > 1 ? 's' : ''}.</p>}
    </div>
  )
}

/** Pastilles des matières (mobile). */
export function SubjectPills({ current }: { current: string }) {
  return (
    <nav className="subj-pills" aria-label="Matières">
      <Link to="/" aria-current={current === 'now' ? 'page' : undefined}>Vue d’ensemble</Link>
      {SUBJ.map((k) => (
        <Link key={k} to={`/m/${k}`} aria-current={current === k ? 'page' : undefined} style={{ ['--c' as string]: `var(${COURSES[k].cssVar})` }}>
          <i />
          {COURSES[k].code}
        </Link>
      ))}
    </nav>
  )
}
