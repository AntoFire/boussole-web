import { useState } from 'react'
import { isRight, quizScore, type QuizItem } from '../../domain/quiz'

interface Props {
  title: string
  initial: QuizItem[]
  onFinish: (items: QuizItem[], secs: number) => void
  onClose: () => void
  onAgain: () => void
}

/** Quiz au format examen : pas de correction avant la fin, retour en arrière possible, questions à revoir. */
export function ExamQuiz({ title, initial, onFinish, onClose, onAgain }: Props) {
  const [items, setItems] = useState(initial)
  const [i, setI] = useState(0)
  const [t0] = useState(() => Date.now())
  const [done, setDone] = useState<{ secs: number } | null>(null)
  const N = items.length
  const it = items[i]
  const answered = items.filter((x) => x.pick != null).length
  const patch = (j: number, p: Partial<QuizItem>) => setItems(items.map((x, k) => (k === j ? { ...x, ...p } : x)))

  if (done) {
    const { ok, p } = quizScore(items)
    const wrong = items.filter((x) => !isRight(x))
    const tone = p >= 80 ? 'green' : p >= 60 ? 'amber' : 'red'
    return (
      <div className="drill" role="dialog" aria-modal="true" aria-label="Résultat du quiz">
        <div className="drill-top">
          <button className="btn ghost" onClick={onClose} aria-label="Fermer">✕</button>
          <div className="drill-bar"><i style={{ width: '100%' }} /></div>
        </div>
        <div className="drill-body">
          <p className="eyebrow">Quiz d’examen · {title}</p>
          <div className="fil-score">{p}<small> / 100 · seuil 80</small></div>
          <p className="small" style={{ margin: '0 0 14px' }}>
            <b style={{ color: `var(--${tone})` }}>
              {p >= 80 ? 'Validé : le quiz du chapitre est réussi.' : p >= 60 ? 'Fragile : refais la feuille blanche demain, puis ce quiz.' : 'Pas encore : relis la fiche, puis feuille blanche demain.'}
            </b>{' '}
            {ok}/{N} en {Math.floor(done.secs / 60)} min {String(done.secs % 60).padStart(2, '0')}.
          </p>
          {wrong.length ? (
            <>
              <div className="eyebrow">Corrections ({wrong.length})</div>
              {wrong.map((x) => (
                <div key={x.id} className="ex-card">
                  <p style={{ margin: 0, fontWeight: 700, whiteSpace: 'pre-wrap' }}>{x.q}</p>
                  <p className="small" style={{ margin: '6px 0 0' }}><b>Ton choix :</b> {x.pick != null ? x.choices[x.order[x.pick]] : '(sans réponse)'}</p>
                  <p className="small" style={{ margin: '4px 0 0', color: 'var(--green)' }}><b>✓ {x.choices[x.answer]}</b></p>
                  {x.why && <p className="small" style={{ margin: '4px 0 0' }}>{x.why}</p>}
                </div>
              ))}
            </>
          ) : (
            <div className="banner info">Aucune erreur.</div>
          )}
        </div>
        <div className="drill-foot">
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary drill-next" onClick={onAgain}>Nouveau quiz</button>
            <button className="btn drill-next" onClick={onClose}>Revenir au chapitre</button>
          </div>
        </div>
      </div>
    )
  }

  const finish = () => {
    const secs = Math.round((Date.now() - t0) / 1000)
    setDone({ secs })
    onFinish(items, secs)
  }
  return (
    <div className="drill" role="dialog" aria-modal="true" aria-label="Quiz d’examen">
      <div className="drill-top">
        <button className="btn ghost" onClick={onClose} aria-label="Quitter">✕</button>
        <div className="drill-bar"><i style={{ width: `${Math.round((answered / N) * 100)}%`, background: 'var(--accent)' }} /></div>
        <span className="mono small muted">{answered}/{N}</span>
      </div>
      <div className="drill-body">
        <div className="row small" style={{ gap: 6, marginBottom: 10 }}>
          {items.map((x, k) => (
            <button key={x.id} className={`xq ${x.pick != null ? 'an' : ''} ${x.flag ? 'fl' : ''} ${k === i ? 'cur' : ''}`} onClick={() => setI(k)} aria-label={`Question ${k + 1}`}>{k + 1}</button>
          ))}
        </div>
        <div className="small muted mono">question {i + 1}/{N} · {title} · format examen : correction à la fin</div>
        <p className="drill-q">{it.q}</p>
        <div className="drill-choices">
          {it.order.map((oi, k) => (
            <button key={k} className={`dchoice ${it.pick === k ? 'sel' : ''}`} onClick={() => { patch(i, { pick: k }); if (i < N - 1) setI(i + 1) }}>
              <span className="dk mono">{k + 1}</span>
              <span>{it.choices[oi]}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className={`btn ${it.flag ? 'primary' : ''}`} onClick={() => patch(i, { flag: !it.flag })}>{it.flag ? '⚑ À revoir' : '⚐ Marquer à revoir'}</button>
        </div>
      </div>
      <div className="drill-foot">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <button className="btn" disabled={!i} onClick={() => setI(i - 1)}>← Précédente</button>
            <button className="btn" disabled={i >= N - 1} onClick={() => setI(i + 1)}>Suivante →</button>
          </div>
          <button className="btn primary" onClick={finish}>{answered < N ? `Terminer (${N - answered} sans réponse)` : 'Terminer et corriger'}</button>
        </div>
      </div>
    </div>
  )
}
