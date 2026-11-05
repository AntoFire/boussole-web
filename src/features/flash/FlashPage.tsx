import { useMemo, useState } from 'react'
import { Chip } from '../../components/Chip'
import { useToast } from '../../components/Toast'
import { useAppData } from '../../data/appData'
import { useStore } from '../../data/provider'
import { addDays, today } from '../../domain/dates'
import { BASE_PER, baselineAppend, baselineSample } from '../../domain/baseline'
import { cascadePath, chCards, chLabel, chList, chOf } from '../../domain/chapters'
import { FL_GOAL, FL_PASS, buildBlock, cardStateAfter, streak } from '../../domain/flash'
import { statsAdd, statsPrune } from '../../domain/stats'
import { COURSE_KEYS, COURSES, type BaselineDoc, type CourseKey, type FlashCard } from '../../domain/types'
import { Drill, type DrillResult } from './Drill'

type Session =
  | { kind: 'block'; course: CourseKey; ch: number; cards: FlashCard[] }
  | { kind: 'errors'; cards: FlashCard[] }
  | { kind: 'baseline'; course: CourseKey; ch: number; cards: FlashCard[]; reduced: boolean }
type Outcome = { session: Session; results: DrillResult[] }

export function FlashPage() {
  const d = useAppData()
  const store = useStore()
  const toast = useToast()
  const [mode, setMode] = useState<'cascade' | 'entry'>('cascade')
  const [session, setSession] = useState<Session | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const day = today()
  const prog = d.flashProg
  const courses = useMemo(() => COURSE_KEYS.filter((c) => d.flash.some((f) => f.course === c && !f.flagged)), [d.flash])
  const todayN = prog.days[day] ?? 0
  const st = streak(prog.days, day)
  const missed = useMemo(() => d.flash.filter((c) => !c.flagged && prog.cards[c.id]?.last === 0), [d.flash, prog.cards])
  const chOfCard = (c: FlashCard) => chOf(c, d.sources)

  const startBlock = (course: CourseKey, ch: number) => {
    const cards = buildBlock(chCards(course, ch, d.flash, d.sources), prog.cards, new Set(), day)
    if (cards.length) setSession({ kind: 'block', course, ch, cards })
  }
  const startBaseline = (course: CourseKey, ch: number) => {
    const s = baselineSample(d.flash, course, ch, chOfCard)
    if (s.cards.length) setSession({ kind: 'baseline', course, ch, cards: s.cards, reduced: s.reduced })
  }

  const finish = async (s: Session, results: DrillResult[]) => {
    setSession(null)
    setOutcome({ session: s, results })
    const n = results.length
    const ok = results.filter((r) => r.ok).length
    const ms = results.reduce((a, r) => a + r.ms, 0)
    try {
      if (s.kind === 'baseline') {
        const doc = d.baselines.find((b) => b.course === s.course && b.ch === s.ch) as (BaselineDoc & { id?: string }) | undefined
        const next = baselineAppend(doc ?? null, s.course, s.ch, {
          d: day, p: Math.round((ok / n) * 100), n, ok, mins: Math.round((ms / 60000) * 100) / 100,
          cardIds: results.map((r) => r.card.id), ...(s.reduced ? { reduced: true } : {}),
        })
        await store.setDoc(`baseline/${s.course}-${s.ch}`, next)
        await store.setDoc('stats/main', statsPrune(statsAdd(d.stats, day, s.course, n, ok, ms), day))
        return
      }
      // Flash normal : Leitner + jour + historique + cascade
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
      if (s.kind === 'block') {
        const p = Math.round((ok / n) * 100)
        next.cascade = { ...next.cascade, [s.course]: { ...(next.cascade[s.course] ?? {}), [String(s.ch)]: { p, ok: p >= FL_PASS * 100, d: day } } }
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
  }

  if (session)
    return (
      <Drill
        key={session.kind + session.cards.map((c) => c.id).join()}
        cards={session.cards}
        baseline={session.kind === 'baseline'}
        title={session.kind === 'errors' ? 'Mes erreurs' : session.kind === 'baseline' ? `Test d’entrée · ${session.course}` : `${session.course} · ${chLabel(session.course, session.ch, d.chcfg, d.flash, d.sources)}`}
        onFinish={(r) => void finish(session, r)}
        onQuit={() => setSession(null)}
      />
    )

  if (outcome) return <Result o={outcome} onClose={() => setOutcome(null)} onRetry={(s) => { setOutcome(null); setSession(s) }} />

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Flash</h1>
        <div className="seg" role="group" aria-label="Mode">
          <button aria-pressed={mode === 'cascade'} onClick={() => setMode('cascade')}>Cascade</button>
          <button aria-pressed={mode === 'entry'} onClick={() => setMode('entry')}>Test d’entrée</button>
        </div>
      </div>
      <div className="card">
        <div className="eyebrow">Aujourd’hui</div>
        <div className="fl-streak">{todayN}<small> / {FL_GOAL} cartes</small></div>
        <div className="progress" style={{ margin: '8px 0' }}><i style={{ width: `${Math.min(100, (todayN / FL_GOAL) * 100)}%` }} /></div>
        <div className="muted small">🔥 série : {st} jour{st > 1 ? 's' : ''} (≥ 5 cartes par jour)</div>
        {mode === 'cascade' && (
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" disabled={!missed.length} onClick={() => setSession({ kind: 'errors', cards: missed.slice(0, 10) })}>
              Revoir mes erreurs ({missed.length})
            </button>
          </div>
        )}
      </div>
      {mode === 'entry' && (
        <div className="banner info">Les premières notes seront basses, c’est prévu. Ce chiffre est ton point de départ, pas un verdict. {BASE_PER} cartes par chapitre, sans indice ; ça ne touche ni tes boîtes Leitner ni tes notions.</div>
      )}
      {courses.map((course) => (mode === 'cascade' ? <CascadeCard key={course} course={course} onStart={startBlock} /> : <EntryCard key={course} course={course} onStart={startBaseline} />))}
    </div>
  )
}

function CascadeCard({ course, onStart }: { course: CourseKey; onStart: (c: CourseKey, ch: number) => void }) {
  const d = useAppData()
  const path = cascadePath(course, undefined, d.chcfg, d.flash, d.sources)
  const entries = d.flashProg.cascade[course] ?? {}
  const current = path.find((c) => !entries[String(c.n)]?.ok) ?? path[path.length - 1]
  return (
    <div className="card casc-row">
      <div className="row"><Chip course={course} /><b>{COURSES[course].name}</b></div>
      <div className="steps-line">
        {path.map((c) => {
          const e = entries[String(c.n)]
          return <span key={c.n} className="tag" title={c.label} style={{ marginRight: 6, opacity: e || c === current ? 1 : 0.5, fontWeight: c === current ? 800 : 600 }}>
            {e?.ok ? '✓' : e ? `${e.p}%` : '·'} ch.{c.n}
          </span>
        })}
      </div>
      {current && (
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => onStart(course, current.n)}>{current.label} · 4 cartes</button>
        </div>
      )}
    </div>
  )
}

function EntryCard({ course, onStart }: { course: CourseKey; onStart: (c: CourseKey, ch: number) => void }) {
  const d = useAppData()
  const chs = chList(course, d.chcfg, d.flash, d.sources).filter((c) => chCards(course, c.n, d.flash, d.sources).length)
  return (
    <div className="card">
      <div className="row"><Chip course={course} /><b>{COURSES[course].name}</b></div>
      {chs.map((c) => {
        const b = d.baselines.find((x) => x.course === course && x.ch === c.n)
        const t0 = b?.runs[0]
        const last = b?.runs[b.runs.length - 1]
        return (
          <div key={c.n} className="fl-card-row">
            <span>{c.label}{t0 && <span className="muted small"> · T0 {t0.p} %{b!.runs.length > 1 ? ` → ${last!.p} %` : ''}{t0.reduced ? ' (échantillon réduit)' : ''}</span>}</span>
            <button className="btn small" onClick={() => onStart(course, c.n)}>{t0 ? 'Re-mesurer' : 'Mesurer T0'}</button>
          </div>
        )
      })}
    </div>
  )
}

function Result({ o, onClose, onRetry }: { o: Outcome; onClose: () => void; onRetry: (s: Session) => void }) {
  const d = useAppData()
  const n = o.results.length
  const ok = o.results.filter((r) => r.ok).length
  const p = Math.round((ok / n) * 100)
  const wrong = o.results.filter((r) => !r.ok)
  const s = o.session
  const baseline = s.kind === 'baseline'
  const passed = p >= FL_PASS * 100
  const fiche = s.kind === 'block' ? chList(s.course, d.chcfg, d.flash, d.sources).find((c) => c.n === s.ch)?.fiche : ''
  return (
    <div className="stack">
      <div className="page-head"><h1>{baseline ? 'Point de départ enregistré' : 'Résultat'}</h1></div>
      <div className="card result">
        <div className="score">{ok}/{n} · {p} %</div>
        {baseline ? <p className="muted">Ce résultat est ton T0. Il ne change rien à tes révisions : il sert de repère pour mesurer ta progression.</p>
          : s.kind === 'block' ? <p>{passed ? 'Chapitre validé : tu passes au suivant.' : `Seuil de ${FL_PASS * 100} % non atteint : relis la fiche puis réessaie.`}</p> : null}
        {!baseline && fiche && !passed && (
          <ul className="fiche"><li>{fiche}</li></ul>
        )}
      </div>
      {!baseline && wrong.length > 0 && (
        <div className="card rem-sec">
          <div className="eyebrow">À corriger</div>
          {wrong.map((r) => (
            <div key={r.card.id} className="fl-card-row" style={{ display: 'block' }}>
              <div>{r.card.q}</div>
              <div className="small"><b>Réponse :</b> {r.card.choices[r.card.answer]}</div>
              {r.card.why && <div className="muted small">{r.card.why}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn primary" onClick={onClose}>Continuer</button>
        {s.kind === 'block' && !passed && <button className="btn" onClick={() => onRetry({ ...s, cards: wrong.map((r) => r.card).concat(s.cards.filter((c) => o.results.find((r) => r.card.id === c.id)?.ok)) })}>Réessayer ce chapitre</button>}
      </div>
    </div>
  )
}
