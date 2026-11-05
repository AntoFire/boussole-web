import { useState } from 'react'
import { Chip } from '../../components/Chip'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { useAppData } from '../../data/appData'
import { useStore } from '../../data/provider'
import { fmtDay, fmtRel, monthKey, today } from '../../domain/dates'
import { applyScore, LEVELS, levelOf, stageLabel, STATUS_LABEL } from '../../domain/notion'
import { nextEvalFor, reason } from '../../domain/priority'
import type { Concept } from '../../domain/types'

export function ConceptSheet({ concept, onClose }: { concept: Concept; onClose: () => void }) {
  const { evals, journal } = useAppData()
  const store = useStore()
  const toast = useToast()
  const [score, setScore] = useState('')
  const t = today()
  const ev = nextEvalFor(concept, evals, t)
  const level = LEVELS[levelOf(concept)]
  const recent = journal.filter((j) => j.concept === concept.id).slice(-5).reverse()

  const save = async () => {
    const n = Number(score)
    if (!Number.isFinite(n) || score.trim() === '' || n < 0 || n > 100) return toast('Entre une note entre 0 et 100')
    try {
      const r = applyScore(concept, n, t)
      await store.updateDoc(`concepts/${concept.id}`, {
        ...r,
        contact: (concept.contact ?? 0) + 1,
        history: [...(concept.history ?? []), { d: t, score: n }],
      })
      const jid = `journal/${monthKey(t)}`
      const cur = await store.getDoc<{ entries?: unknown[] }>(jid)
      await store.setDoc(jid, { entries: [...(cur?.entries ?? []), { d: t, concept: concept.id, score: n }] })
      toast(n >= 85 ? 'Validé' : 'Noté : à revoir bientôt')
      onClose()
    } catch (e) {
      toast('Enregistrement impossible : ' + (e as Error).message)
    }
  }
  const toggleMission = async (i: number) => {
    const ms = (concept.missions ?? []).map((m, k) => (k === i ? { ...m, done: !m.done } : m))
    await store.updateDoc(`concepts/${concept.id}`, { missions: ms })
  }

  return (
    <Sheet onClose={onClose} label={concept.name}>
      <div className="sheet-head">
        <div>
          <div className="row"><Chip course={concept.course} />{concept.ch !== undefined && <span className="tag">ch. {concept.ch}</span>}</div>
          <h2>{concept.name}</h2>
        </div>
        <button className="btn ghost" onClick={onClose} aria-label="Fermer">✕</button>
      </div>
      <div className="stack-sm">
        <div className="row"><span className="tag">{STATUS_LABEL[concept.status]}</span><span className="tag">{stageLabel(concept)}</span></div>
        <p className="muted small">{concept.nextDue ? `Prochaine révision : ${fmtDay(concept.nextDue)} (${fmtRel(concept.nextDue, t)})` : 'Jamais révisée'}{concept.lastReview ? ` · dernière : ${fmtDay(concept.lastReview)}` : ''}</p>
        {ev && <p className="small">{reason(concept, evals, t)}</p>}
        {concept.plain && <div className="qbox"><div className="eyebrow">En clair</div>{concept.plain}</div>}
        <div className="lens l1"><h3><span className="n">Objectif de cette passe</span>{level.k}</h3>{level.t}</div>
        {concept.missions && concept.missions.length > 0 && (
          <div>
            <div className="eyebrow">Missions</div>
            {concept.missions.map((m, i) => (
              <label key={i} className="fl-card-row" style={{ cursor: 'pointer' }}>
                <span style={{ textDecoration: m.done ? 'line-through' : 'none' }}>{m.t}</span>
                <input type="checkbox" checked={!!m.done} onChange={() => void toggleMission(i)} />
              </label>
            ))}
          </div>
        )}
        <div className="qbox stack-sm">
          <div className="eyebrow">J’ai fait un exercice ailleurs : note-le</div>
          <div className="field-row">
            <input type="number" min={0} max={100} inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value)} placeholder="Note sur 100" aria-label="Note sur 100" style={{ width: 130, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)' }} />
            <button className="btn primary" onClick={() => void save()}>Enregistrer</button>
          </div>
          <span className="muted small">≥ 85 : série +1 · 60-84 : fragile, retour demain · &lt; 60 : à retravailler, retour demain</span>
        </div>
        {recent.length > 0 && (
          <div>
            <div className="eyebrow">Dernières notes</div>
            {recent.map((j, i) => <div key={i} className="fl-card-row"><span>{fmtDay(j.d)}</span><b className="mono">{j.score}</b></div>)}
          </div>
        )}
      </div>
    </Sheet>
  )
}
