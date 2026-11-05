import { NavLink, Outlet } from 'react-router-dom'
import { useAppData } from '../data/appData'
import { dueList } from '../domain/priority'
import { today } from '../domain/dates'
import { Icon, type IconName } from './Icon'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Maintenant', icon: 'now' },
  { to: '/flash', label: 'Flash', icon: 'flash' },
  { to: '/review', label: 'Réviser', icon: 'review' },
  { to: '/evals', label: 'Échéances', icon: 'evals' },
]

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
  const due = dueList(concepts, today()).length
  const link = (t: (typeof TABS)[number], mobile: boolean) => (
    <NavLink key={t.to} to={t.to} end={t.to === '/'} className={mobile ? undefined : 'nav-btn'} aria-label={t.label}>
      {({ isActive }) => (
        <span className={mobile ? 'tab-inner' : 'nav-inner'} aria-current={isActive ? 'page' : undefined} style={{ display: 'contents' }}>
          <Icon name={t.icon} />
          {mobile ? <span>{t.label}</span> : t.label}
          {t.to === '/review' && due > 0 && (mobile ? <span className="dot">{due}</span> : <span className="count">{due}</span>)}
        </span>
      )}
    </NavLink>
  )
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
        <div id="nav">{TABS.map((t) => link(t, false))}</div>
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
        {TABS.map((t) => link(t, true))}
      </nav>
    </div>
  )
}
