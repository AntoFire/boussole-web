import { useEffect, useRef, useState } from 'react'
import type { FlashCard } from '../../domain/types'
import { capMs } from '../../domain/stats'

export interface DrillResult {
  card: FlashCard
  ok: boolean
  ms: number
}

interface Props {
  cards: FlashCard[]
  title: string
  /** Test d'entrée : pas de rappel actif, pas d'explication, pas de combo. */
  baseline?: boolean
  onFinish: (results: DrillResult[]) => void
  onQuit: () => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function Drill({ cards, title, baseline, onFinish, onQuit }: Props) {
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<'recall' | 'choose' | 'feedback'>(baseline ? 'choose' : 'recall')
  const [picked, setPicked] = useState<number | null>(null)
  const [results, setResults] = useState<DrillResult[]>([])
  const [combo, setCombo] = useState(0)
  const t0 = useRef(0)
  const card = cards[i]

  useEffect(() => {
    if (phase === 'choose') t0.current = Date.now()
  }, [phase, i])

  if (!card) return null
  const ok = picked === card.answer

  const choose = (n: number) => {
    if (phase !== 'choose') return
    const good = n === card.answer
    setPicked(n)
    setPhase('feedback')
    setCombo((c) => (good ? c + 1 : 0))
    setResults((r) => [...r, { card, ok: good, ms: capMs(Date.now() - t0.current) }])
  }
  const next = () => {
    if (i + 1 >= cards.length) return onFinish(results)
    setI(i + 1)
    setPicked(null)
    setPhase(baseline ? 'choose' : 'recall')
  }

  return (
    <div className="drill" role="dialog" aria-modal="true" aria-label={title}>
      <div className="drill-top">
        <button className="btn ghost small" onClick={onQuit} aria-label="Quitter">✕</button>
        <div className="drill-bar" role="progressbar" aria-valuemin={0} aria-valuemax={cards.length} aria-valuenow={i + (phase === 'feedback' ? 1 : 0)}>
          <i style={{ width: `${((i + (phase === 'feedback' ? 1 : 0)) / cards.length) * 100}%` }} />
        </div>
        {!baseline && <span className="drill-combo">{combo >= 2 ? `🔥×${combo}` : ''}</span>}
      </div>
      <div className="drill-body">
        <div className="muted small">{title} · {i + 1}/{cards.length}</div>
        <div className="drill-q">{card.q}</div>
        {phase === 'recall' ? (
          <div className="recall-box stack-sm">
            <b>Réponds dans ta tête d’abord.</b>
            <span className="muted">Se forcer à retrouver la réponse avant de voir les choix, c’est ce qui ancre la mémoire.</span>
            <button className="btn primary" onClick={() => setPhase('choose')}>Voir les choix</button>
          </div>
        ) : (
          <div className="drill-choices">
            {card.choices.map((c, n) => {
              const state = phase === 'feedback' ? (n === card.answer ? 'ok' : n === picked ? 'ko' : '') : ''
              return (
                <button key={n} className={`dchoice ${state}`} disabled={phase === 'feedback'} onClick={() => choose(n)}>
                  <span className="dk">{LETTERS[n]}</span>
                  <span>{c}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      {phase === 'feedback' && (
        <div className={`drill-foot ${baseline ? '' : ok ? 'good' : 'bad'}`}>
          <div className="stack-sm">
            {baseline ? <b>Réponse enregistrée</b> : <b>{ok ? 'Juste' : 'Pas tout à fait'}</b>}
            {!baseline && card.why && <div>{card.why}</div>}
            <div className="row">
              <button className="btn primary drill-next" onClick={next}>{i + 1 >= cards.length ? 'Terminer' : 'Suivant'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
