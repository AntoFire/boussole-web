import { useEffect, useState } from 'react'
import { fmtDay } from '../../domain/dates'
import {
  BLANK_GUIDE, BLANK_MIN, BLANK_PASS, BLANK_REV, appendRun, blankGuidedDefault, blankScore, chState, type ChState,
} from '../../domain/subjects'
import type { BlankRun, ChProg } from '../../domain/types'

type Blank =
  | { phase: 'write'; t0: number; min: number; guided: boolean; txt: string; g: string[] }
  | { phase: 'check'; hit: boolean[]; txt: string }
  | { phase: 'relearn' | 'rewrite' | 'recheck'; miss: number[]; round: number }

interface Props {
  st: ChState
  doc: Partial<ChProg> | undefined
  pts: string[]
  today: string
  save: (patch: Partial<ChProg>) => Promise<boolean>
  toast: (m: string) => void
  /** prévient la fiche qu'une saisie est en cours (pour masquer la fiche du chapitre) */
  onWriting: (writing: boolean) => void
}

function Timer({ t0, min }: { t0: number; min: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, min * 60e3 - (now - t0))
  const m = Math.floor(left / 6e4)
  const s = Math.floor((left % 6e4) / 1e3)
  return (
    <div className="timer-face" style={{ margin: '6px 0', color: left ? undefined : 'var(--amber)' }} aria-live="off">
      {m}:{String(s).padStart(2, '0')}
    </div>
  )
}

export function BlankPanel({ st, doc, pts, today, save, toast, onWriting }: Props) {
  const [b, setB] = useState<Blank | null>(null)
  const [lastRes, setLastRes] = useState<number | null>(null)
  const [loopDone, setLoopDone] = useState<number | null>(null)
  const writing = b?.phase === 'write' || b?.phase === 'rewrite'
  useEffect(() => onWriting(writing), [writing, onWriting])

  const syncGuided = (g: string[]) =>
    BLANK_GUIDE.map(([q], i) => ((g[i] ?? '').trim() ? `${i + 1}. ${q}\n${g[i].trim()}` : '')).filter(Boolean).join('\n\n')

  const start = () => {
    setLastRes(null)
    setLoopDone(null)
    setB({ phase: 'write', t0: Date.now(), min: st.runs.length ? BLANK_REV : BLANK_MIN, guided: blankGuidedDefault(st), txt: '', g: [] })
  }

  const saveRun = async (hit: boolean[]) => {
    const p = blankScore(hit)
    const runs = appendRun(doc?.blank, { d: today, p })
    if (!(await save({ blank: runs }))) return
    toast(`Feuille blanche : ${p} % · +30 XP`)
    setLastRes(p)
    const miss = hit.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0)
    setB(miss.length ? { phase: 'relearn', miss, round: 1 } : null)
  }

  const finishLoop = async (round: number) => {
    const runs: BlankRun[] = [...(doc?.blank ?? [])]
    if (runs.length) {
      runs[runs.length - 1] = { ...runs[runs.length - 1], loops: round }
      await save({ blank: runs })
    }
    setB(null)
    setLoopDone(round)
    toast(`Tous les points retrouvés en ${round} tour${round > 1 ? 's' : ''}`)
  }

  let body: React.ReactNode
  if (!b) {
    body = (
      <>
        <p className="small" style={{ margin: '6px 0 10px' }}>
          {st.runs.length ? BLANK_REV : BLANK_MIN} minutes, sans notes : écris tout ce dont tu te souviens du chapitre (sur papier ou ici). Ensuite, coche les points clés retrouvés, puis réapprends ceux qui manquent jusqu’à tous les retrouver. Seuil : {BLANK_PASS} %.
          {blankGuidedDefault(st) ? ' Mode guidé : 5 questions pour ne pas partir d’une page vide.' : ''}
        </p>
        {st.due && (
          <p className={`small ${st.dueNow ? '' : 'muted'}`} style={{ margin: '0 0 10px' }}>
            {st.dueNow ? <b>Due aujourd’hui.</b> : `Prochaine feuille blanche : ${fmtDay(st.due).replace(/\.$/, '')}.`} Calendrier : J+1, J+3, J+7, J+16, J+35 ; sous {BLANK_PASS} %, retour à J+1.
            {st.streak ? ` Série : ${st.streak} réussite${st.streak > 1 ? 's' : ''} de suite.` : ''}
          </p>
        )}
        <button className="btn primary" disabled={!pts.length} onClick={start}>Démarrer la feuille blanche</button>
        {!pts.length && <p className="small muted" style={{ margin: '8px 0 0' }}>Il faut d’abord des points clés (ci-dessous).</p>}
        {st.runs.length > 0 && (
          <div className="small muted mono" style={{ marginTop: 10 }}>
            Historique : {st.runs.slice(-6).map((r) => `${r.p} % (${fmtDay(r.d)})`).join(' · ')}
          </div>
        )}
      </>
    )
  } else if (b.phase === 'write') {
    body = (
      <>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Timer t0={b.t0} min={b.min} />
          <div className="seg" role="group" aria-label="Mode de la feuille blanche">
            <button aria-pressed={b.guided} onClick={() => setB({ ...b, guided: true })}>Guidée</button>
            <button aria-pressed={!b.guided} onClick={() => setB({ ...b, guided: false })}>Libre</button>
          </div>
        </div>
        {b.guided ? (
          <>
            <p className="small muted" style={{ margin: '0 0 8px' }}>Réponds de tête sous chaque question. Mots-clés et flèches suffisent ; laisse vide ce qui ne vient pas.</p>
            {BLANK_GUIDE.map(([q, h], i) => (
              <div key={i} style={{ marginTop: i ? 10 : 0 }}>
                <label className="small" htmlFor={`bg${i}`} style={{ display: 'block' }}><b>{i + 1}. {q}</b></label>
                <textarea id={`bg${i}`} className="inp" placeholder={h} style={{ minHeight: 56 }} value={b.g[i] ?? ''}
                  onChange={(e) => { const g = [...b.g]; g[i] = e.target.value; setB({ ...b, g, txt: syncGuided(g) }) }} />
              </div>
            ))}
          </>
        ) : (
          <textarea className="inp" aria-label="Ta feuille blanche" placeholder="Écris de tête : définitions, formules, à quoi ça sert, un exemple…" value={b.txt} onChange={(e) => setB({ ...b, txt: e.target.value })} />
        )}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => setB({ phase: 'check', hit: pts.map(() => false), txt: b.txt })}>J’ai fini → corriger</button>
          <button className="btn ghost" onClick={() => setB(null)}>Annuler</button>
        </div>
      </>
    )
  } else if (b.phase === 'check') {
    const k = b.hit.filter(Boolean).length
    body = (
      <>
        <p className="small" style={{ margin: '6px 0 8px' }}>Coche honnêtement chaque point que tu avais écrit, même formulé autrement.</p>
        {b.txt && (
          <details className="small" style={{ marginBottom: 8 }}>
            <summary>Ta feuille</summary>
            <div className="formula" style={{ marginTop: 6 }}>{b.txt}</div>
          </details>
        )}
        <div>
          {pts.map((p, i) => (
            <label key={i} className={`choice ${b.hit[i] ? 'ok' : ''}`}>
              <input type="checkbox" checked={b.hit[i]} onChange={(e) => { const hit = [...b.hit]; hit[i] = e.target.checked; setB({ ...b, hit }) }} />
              <span>{p}</span>
            </label>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => void saveRun(b.hit)}>Valider : {k}/{pts.length} ({blankScore(b.hit)} %)</button>
          <button className="btn ghost" onClick={() => setB(null)}>Annuler</button>
        </div>
      </>
    )
  } else if (b.phase === 'relearn') {
    body = (
      <>
        <div className="banner warn" style={{ margin: '6px 0 8px' }}>
          Tour {b.round} : relis ce{b.miss.length > 1 ? 's' : ''} {b.miss.length} point{b.miss.length > 1 ? 's' : ''} manqué{b.miss.length > 1 ? 's' : ''} (et la fiche ci-dessous si besoin). Prends 1 à 2 minutes, puis cache-les et réécris-les de tête.
        </div>
        <ul className="fiche">{b.miss.map((i) => <li key={i}>{pts[i]}</li>)}</ul>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => setB({ ...b, phase: 'rewrite' })}>C’est lu → les réécrire de tête</button>
          <button className="btn ghost" onClick={() => { setB(null); toast('Boucle arrêtée : les points manqués reviennent demain') }}>Arrêter la boucle</button>
        </div>
      </>
    )
  } else if (b.phase === 'rewrite') {
    body = (
      <>
        <p className="small" style={{ margin: '6px 0 8px' }}>Tour {b.round} : réécris de tête les {b.miss.length} point{b.miss.length > 1 ? 's' : ''} que tu viens de relire.</p>
        <textarea className="inp" aria-label="Réécriture de tête" placeholder="De tête, sans regarder…" />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => setB({ ...b, phase: 'recheck' })}>Corriger</button>
        </div>
      </>
    )
  } else {
    body = <Recheck pts={pts} b={b} onDone={(miss) => (miss.length ? setB({ phase: 'relearn', miss, round: b.round + 1 }) : void finishLoop(b.round))} />
  }

  const res = lastRes != null && (
    <div className={`result ${lastRes >= BLANK_PASS ? 'good' : lastRes >= 60 ? 'mid' : 'bad'}`}>
      <div className="score">{lastRes} %</div>
      <div className="small">
        {loopDone ? `Boucle terminée : tous les points retrouvés en ${loopDone} tour${loopDone > 1 ? 's' : ''}. ` : ''}
        {lastRes >= BLANK_PASS ? `Validé. Prochaine feuille blanche : ${fmtDay(chState(doc, st.q, today).due ?? today).replace(/\.$/, '')}.` : 'Elle revient demain : c’est la répétition qui fixe.'}
      </div>
    </div>
  )
  return (
    <>
      {body}
      {res}
    </>
  )
}

function Recheck({ pts, b, onDone }: { pts: string[]; b: { miss: number[] }; onDone: (stillMissing: number[]) => void }) {
  const [ok, setOk] = useState<Set<number>>(new Set())
  return (
    <>
      <p className="small" style={{ margin: '6px 0 8px' }}>Coche ceux que tu as bien réécrits.</p>
      {b.miss.map((i) => (
        <label key={i} className={`choice ${ok.has(i) ? 'ok' : ''}`}>
          <input type="checkbox" checked={ok.has(i)} onChange={(e) => { const s = new Set(ok); if (e.target.checked) s.add(i); else s.delete(i); setOk(s) }} />
          <span>{pts[i]}</span>
        </label>
      ))}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={() => onDone(b.miss.filter((i) => !ok.has(i)))}>Valider ce tour</button>
      </div>
    </>
  )
}
