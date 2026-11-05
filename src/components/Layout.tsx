import { NavLink, Outlet } from 'react-router-dom'
import { useAppData } from '../data/appData'
import { dueList } from '../domain/priority'
import { today } from '../domain/dates'
import { SUBJ, dueSheets, levelOfXP, subRows, subXP } from '../domain/subjects'
import { COURSES } from '../domain/types'
import { ChapterHost } from '../features/subjects/ChapterSheet'
import { useSubjectCtx } from '../features/subjects/parts'
import { Icon, type IconName } from './Icon'

const TOOLS: { to: string; label: string; icon: IconName }[] = [
  { to: '/flash', label: 'Flash', icon: 'flash' },
  { to: '/review', label: 'Réviser', icon: 'review' },
  { to: '/evals', label: 'Échéances', icon: 'evals' },
]
const TABS: { to: string; label: string; icon: IconName }[] = [{ to: '/', label: 'Aujourd’hui', icon: 'now' }, { to: '/m/MATH', label: 'Matières', icon: 'subjects' }, ...TOOLS]

function Brand({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="17" r="15" fill="none" stroke="var(--ink)" strokeWidth="2" />
      <path d="M17 5 L21 17 L17 29 L13 17 Z" fill="var(--accent)" />
      <path d="M17 17 L21 17 L17 29 L13 17Z" fill="var(--ink)" />
      <circle cx="17" cy="17" r="2" fill="var(--surface)" />
    </svg>
  )
}

export function Layout() {
  const { concepts } = useAppData()
  const x = useSubjectCtx()
  const due = dueList(concepts, today()).length
  const badge = (to: string, mobile: boolean) =>
    to === '/review' && due > 0 ? (mobile ? <span className="dot">{due}</span> : <span className="count">{due}</span>) : null
  return (
    <div className="shell">
      <nav className="rail" aria-label="Navigation principale">
        <div className="brand">
          <Brand size={34} />
          <div>
            <b>Boussole</b>
            <small>DESS IA · Laval</small>
          </div>
        </div>
        <div id="nav">
          <NavLink to="/" end className="nav-btn">
            <Icon name="now" />
            Vue d’ensemble
          </NavLink>
          <div className="nav-h">Matières</div>
          {SUBJ.map((k) => {
            const n = dueSheets([k], x).length
            const lv = levelOfXP(subXP(subRows(k, x)))
            return (
              <NavLink key={k} to={`/m/${k}`} className="nav-btn nav-sub" style={{ ['--c' as string]: `var(${COURSES[k].cssVar})` }}>
                <span className="sdot" />
                <span className="nm">
                  {COURSES[k].name}
                  <small className="nav-lv mono">niv. {lv}</small>
                </span>
                {n > 0 && <span className="count" style={{ background: 'var(--amber)' }} title={`${n} feuille(s) blanche(s) due(s)`}>{n}</span>}
              </NavLink>
            )
          })}
          <NavLink to="/m/STT" className="nav-btn nav-sub nav-later" style={{ ['--c' as string]: `var(${COURSES.STT.cssVar})` }}>
            <span className="sdot" />
            <span className="nm">
              {COURSES.STT.name}
              <small className="nav-lv">reprise été 2027</small>
            </span>
          </NavLink>
          <div className="nav-h">Outils</div>
          {TOOLS.map((t) => (
            <NavLink key={t.to} to={t.to} className="nav-btn">
              <Icon name={t.icon} />
              {t.label}
              {badge(t.to, false)}
            </NavLink>
          ))}
        </div>
        <div className="rail-foot">
          <NavLink to="/data" className="nav-btn">
            <Icon name="data" />
            Données
          </NavLink>
        </div>
      </nav>
      <main id="main">
        <div className="mobile-top">
          <div className="row">
            <Brand size={26} />
            <b style={{ fontFamily: 'var(--f-display)', fontSize: 18 }}>Boussole</b>
          </div>
          <NavLink to="/data" className="btn ghost small">
            Données
          </NavLink>
        </div>
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Navigation">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} aria-label={t.label}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
            {badge(t.to, true)}
          </NavLink>
        ))}
      </nav>
      <ChapterHost />
    </div>
  )
}
