import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chip } from '../../components/Chip'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { useAppData } from '../../data/appData'
import { useStore } from '../../data/provider'
import { chLabel } from '../../domain/chapters'
import { fmtDay, today } from '../../domain/dates'
import { buildBlock } from '../../domain/flash'
import { QZ_N, drawQuiz, progAfterQuiz, type QuizItem } from '../../domain/quiz'
import { LV, chCards, chFiche, chPoints, chProgId, chState, splitFiche } from '../../domain/subjects'
import { COURSES, COURSE_KEYS, type ChProg, type CourseKey, type FlashCard } from '../../domain/types'
import { Drill } from '../flash/Drill'
import { useRecordFlash } from '../flash/useRecord'
import { BlankPanel } from './BlankPanel'
import { ExamQuiz } from './ExamQuiz'
import { FichePanel } from '../ai/FichePanel'
import { LvBadge } from './parts'

function parseCh(v: string | null): { c: CourseKey; n: number } | null {
  const m = v?.match(/^([A-Z]+)-(\d+)$/)
  if (!m || !COURSE_KEYS.includes(m[1] as CourseKey)) return null
  return { c: m[1] as CourseKey, n: Number(m[2]) }
}

type Mode = { k: 'sheet' } | { k: 'recall'; cards: FlashCard[] } | { k: 'exam'; items: QuizItem[] }

/** Fiche de chapitre ouverte par-dessus n'importe quelle page via ?ch=COURSE-n, avec ses quiz plein écran. */
export function ChapterHost() {
  const [params, setParams] = useSearchParams()
  const target = parseCh(params.get('ch'))
  const [mode, setMode] = useState<Mode>({ k: 'sheet' })
  const d = useAppData()
  const store = useStore()
  const toast = useToast()
  const record = useRecordFlash()
  const close = useCallback(() => {
    const p = new URLSearchParams(params)
    p.delete('ch')
    setParams(p)
    setMode({ k: 'sheet' })
  }, [params, setParams, setMode])
  if (!target) return null
  const { c, n } = target
  const label = chLabel(c, n, d.chcfg, d.flash, d.sources)
  const cards = chCards(c, n, d.flash, d.sources)

  if (mode.k === 'recall')
    return (
      <Drill
        cards={mode.cards}
        title={`${COURSES[c].code} · ${label}`}
        onQuit={() => setMode({ k: 'sheet' })}
        onFinish={(r) => { void record(r, { course: c, ch: n }); setMode({ k: 'sheet' }); toast(`Rappel rapide : ${r.filter((x) => x.ok).length}/${r.length}`) }}
      />
    )
  if (mode.k === 'exam')
    return (
      <ExamHost
        key={mode.items.map((x) => x.id).join()}
        title={label}
        items={mode.items}
        onClose={() => setMode({ k: 'sheet' })}
        onAgain={() => setMode({ k: 'exam', items: drawQuiz(cards, d.flashProg.cards) })}
        onFinish={async (items) => {
          try {
            await store.setDoc('flashprog/main', progAfterQuiz(d.flashProg, items, c, n, today(), new Date().toISOString()))
          } catch {
            toast('Résultat non enregistré (réseau)')
          }
        }}
      />
    )
  return (
    <ChapterSheet
      c={c}
      n={n}
      onClose={close}
      onRecall={() => {
        const block = buildBlock(cards, d.flashProg.cards, new Set(), today())
        if (block.length) setMode({ k: 'recall', cards: block })
        else toast('Pas encore de cartes pour ce chapitre')
      }}
      onExam={() => {
        const items = drawQuiz(cards, d.flashProg.cards)
        if (items.length) setMode({ k: 'exam', items })
        else toast('Pas encore de questions pour ce chapitre')
      }}
    />
  )
}

function ExamHost(p: { title: string; items: QuizItem[]; onClose: () => void; onAgain: () => void; onFinish: (items: QuizItem[]) => Promise<void> }) {
  return <ExamQuiz title={p.title} initial={p.items} onClose={p.onClose} onAgain={p.onAgain} onFinish={(items) => void p.onFinish(items)} />
}

function ChapterSheet({ c, n, onClose, onRecall, onExam }: { c: CourseKey; n: number; onClose: () => void; onRecall: () => void; onExam: () => void }) {
  const d = useAppData()
  const store = useStore()
  const toast = useToast()
  const t = today()
  const id = chProgId(c, n)
  const doc = d.chprog[id]
  const st = chState(doc, d.flashProg.cascade[c]?.[String(n)], t)
  const label = chLabel(c, n, d.chcfg, d.flash, d.sources)
  const cards = chCards(c, n, d.flash, d.sources)
  const P = chPoints(doc, cards)
  const fi = chFiche(c, n, d.chcfg, d.flash, d.sources)
  const v = doc?.video ?? {}
  const sg = doc?.videoSugg
  const [sum, setSum] = useState(v.sum ?? '')
  const [url, setUrl] = useState(v.url ?? '')
  const [ptsTxt, setPtsTxt] = useState(P.pts.join('\n'))
  const [writing, setWriting] = useState(false)

  const save = useCallback(
    async (patch: Partial<ChProg>) => {
      const cur = d.chprog[id] ?? {}
      try {
        await store.setDoc(`chprog/${id}`, { ...cur, ...patch, course: c, ch: n })
        return true
      } catch {
        toast('Non enregistré (réseau) : réessaie')
        return false
      }
    },
    [d.chprog, id, store, c, n, toast],
  )
  const ytq = encodeURIComponent(`${label} ${c === 'MATH' ? 'maths cours' : COURSES[c].name} explication`)
  const flow = (on: boolean, mid: boolean) => (on ? 'on' : mid ? 'mid' : '')

  return (
    <Sheet onClose={onClose} label={label}>
      <div style={{ ['--c' as string]: `var(${COURSES[c].cssVar})` }}>
        <div className="sheet-head">
          <div>
            <div className="row small"><Chip course={c} /><LvBadge st={st} /><span className="muted">{LV[st.lv].t}{st.late ? ' · à revoir' : ''}</span></div>
            <h2 style={{ marginTop: 6 }}>{label}</h2>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="ch-flow">
          <span className={flow(st.seen, false)}>📄 Comprendre</span><i />
          <span className={flow(st.last != null && st.last >= 80, st.last != null)}>📝 Feuille blanche</span><i />
          <span className={flow(st.qp != null && st.qp >= 80, st.qp != null)}>❓ Quiz</span>
        </div>

        <section className="lens l1">
          <h3><span className="n">1</span>Comprendre avec le cours du prof</h3>
          <p className="small" style={{ margin: '6px 0 8px' }}>Le support du prof d’abord : c’est lui qui fixe les notions, la notation et le niveau de l’examen.</p>
          {fi.own.filter((s) => s.url).length ? (
            fi.own.filter((s) => s.url).map((s) => (
              <div key={s.id} className="rd-src">
                <b className="small">📄 {s.title}</b>
                <div className="row" style={{ marginTop: 6 }}><a className="btn" href={s.url} target="_blank" rel="noopener noreferrer">Ouvrir le support ↗</a></div>
              </div>
            ))
          ) : (
            <p className="small muted">Pas encore de lien vers un support du prof pour ce chapitre. Tu peux importer le PDF ci-dessous : l’appli en tire une fiche.</p>
          )}
          <FichePanel c={c} n={n} label={label} />
          <label className="small muted" htmlFor="ch-sum" style={{ display: 'block', marginTop: 10 }}>Ce que tu retiens, en une phrase</label>
          <input id="ch-sum" className="inp" value={sum} onChange={(e) => setSum(e.target.value)} placeholder="Ex. : un embedding place les mots proches dans l’espace…" />
          <div className="row" style={{ marginTop: 8 }}>
            <button className={`btn ${v.seen ? '' : 'primary'}`} onClick={async () => {
              const first = !v.seen
              if (await save({ video: { ...v, url: url.trim(), sum: sum.trim(), seen: true, d: v.d || t } })) toast(first ? 'Cours vu · +10 XP' : 'Mis à jour')
            }}>{v.seen ? 'Mettre à jour' : 'Cours vu (+10 XP)'}</button>
            {v.seen && <span className="small muted">Vu le {fmtDay(v.d || t)}</span>}
          </div>
          <details style={{ marginTop: 12 }} open={!!v.url}>
            <summary className="small"><b>Vidéo de renfort</b> <span className="muted">· seulement si tu bloques sur un point</span></summary>
            {sg?.url ? (
              <div className="hint" style={{ marginTop: 8 }}>
                <b>VÉRIFIÉE CONTRE LA FICHE DU COURS</b>
                <a href={sg.url} target="_blank" rel="noopener noreferrer">▶ {sg.title || 'Vidéo'} ↗</a>
                {sg.mins ? <span className="mono small"> · {sg.mins} min</span> : null}
                {sg.why && <div className="small" style={{ marginTop: 4 }}>{sg.why}</div>}
              </div>
            ) : sg?.none ? (
              <p className="small muted" style={{ margin: '8px 0 0' }}>Aucune vidéo ne colle assez au cours pour ce chapitre : reste sur le support du prof.</p>
            ) : null}
            <label className="small muted" htmlFor="ch-url" style={{ display: 'block', marginTop: 8 }}>Ou ta propre vidéo (à comparer à la fiche du cours)</label>
            <input id="ch-url" className="inp" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
            <div className="row" style={{ marginTop: 6 }}>
              {v.url && <a className="btn" href={v.url} target="_blank" rel="noopener noreferrer">▶ Ouvrir ↗</a>}
              <a className="btn ghost" href={`https://www.youtube.com/results?search_query=${ytq}`} target="_blank" rel="noopener noreferrer">Chercher sur YouTube ↗</a>
            </div>
          </details>
        </section>

        <section className="lens l2">
          <h3><span className="n">2</span>Feuille blanche</h3>
          <BlankPanel st={st} doc={doc} pts={P.pts} today={t} save={save} toast={toast} onWriting={setWriting} />
          <details style={{ marginTop: 12 }}>
            <summary className="small"><b>Points clés ({P.pts.length})</b>{P.src === 'cards' ? ' · tirés des cartes Flash' : ''}</summary>
            <label className="small muted" htmlFor="ch-pts" style={{ display: 'block', marginTop: 8 }}>Un point par ligne</label>
            <textarea id="ch-pts" className="inp" value={ptsTxt} onChange={(e) => setPtsTxt(e.target.value)} />
            <button className="btn small" style={{ marginTop: 6 }} onClick={async () => {
              const pts = ptsTxt.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 15)
              if (!pts.length) return toast('Au moins un point')
              if (await save({ points: pts })) toast('Points clés enregistrés')
            }}>Enregistrer les points</button>
          </details>
        </section>

        <section className="lens l3">
          <h3><span className="n">3</span>Quiz d’examen du chapitre</h3>
          <p className="small" style={{ margin: '6px 0 10px' }}>
            Format examen : {QZ_N} questions (au moins la moitié d’exercices), sans correction avant la fin, retour en arrière possible. Seuil : 80 %. {cards.length} carte{cards.length > 1 ? 's' : ''} dans ce chapitre pour l’instant.
          </p>
          {st.q && <div className="small muted mono" style={{ marginBottom: 8 }}>Dernier quiz : {st.qp} % · {fmtDay(st.q.d)}</div>}
          <div className="row">
            <button className="btn primary" disabled={!cards.length} onClick={onExam}>📝 Quiz d’examen ({Math.min(QZ_N, cards.length)} questions)</button>
            <button className="btn ghost" disabled={!cards.length} onClick={onRecall}>⚡ Rappel rapide (4 cartes)</button>
          </div>
        </section>

        {!writing && (
          <details className="lens l4">
            <summary><b>Fiche du chapitre</b> <span className="small muted">(à lire après la feuille blanche, pas avant)</span></summary>
            {fi.text ? <ul className="fiche">{splitFiche(fi.text).map((p, i) => <li key={i}>{p}</li>)}</ul> : <p className="small muted">Pas de fiche rédigée pour ce chapitre.</p>}
            {fi.srcs.length > 0 && (
              <ul className="fl-src">
                {fi.srcs.filter((s) => s.url).slice(0, 4).map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a></li>)}
              </ul>
            )}
          </details>
        )}
      </div>
    </Sheet>
  )
}
