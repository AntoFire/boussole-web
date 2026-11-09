import { useRef, useState } from 'react'
import { useToast } from '../../components/Toast'
import { useAppData } from '../../data/appData'
import { useStore } from '../../data/provider'
import { deleteCourseDoc, loadCourseChunks, saveCourseDoc } from '../../ai/docs'
import { AiError, toAiError } from '../../ai/errors'
import { ficheKeyPoints, generateFiche, type FichePart } from '../../ai/ficheFlow'
import { PdfError, extractPdf } from '../../ai/pdf'
import { fmtDay } from '../../domain/dates'
import { chProgId } from '../../domain/subjects'
import { COURSES, type CourseKey } from '../../domain/types'
import { FicheView } from './FicheView'

const msg = (e: unknown) => (e instanceof AiError || e instanceof PdfError ? e.message : toAiError(e).message)

/** Import d'un cours en PDF, génération de la fiche avec relecture, enregistrement dans le chapitre. */
export function FichePanel({ c, n, label }: { c: CourseKey; n: number; label: string }) {
  const d = useAppData()
  const store = useStore()
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ docId: string; model: string; parts: FichePart[] } | null>(null)
  const id = chProgId(c, n)
  const saved = d.chprog[id]?.aiFiche
  const docs = Object.entries(d.cdocs)
    .filter(([, x]) => x.course === c && x.ch === n)
    .sort((a, b) => a[1].created.localeCompare(b[1].created))

  const run = async (what: string, f: () => Promise<void>) => {
    setBusy(what)
    setError(null)
    try {
      await f()
    } catch (e) {
      setError(msg(e))
    } finally {
      setBusy(null)
    }
  }

  const importPdf = (f: File) =>
    run('Lecture du PDF…', async () => {
      const r = await extractPdf(f, (done, total) => setBusy(`Lecture du PDF : page ${done}/${total}`))
      if (r.analysis.scanned)
        throw new PdfError('Ce PDF n’a pas de texte extractible (scan ou images). La reconnaissance de texte (OCR) n’est pas encore disponible : utilise un PDF exporté depuis un traitement de texte ou PowerPoint.')
      setBusy('Enregistrement…')
      await saveCourseDoc(store, { course: c, ch: n, name: f.name, numPages: r.numPages, chars: r.analysis.chars, chunks: r.chunks })
      toast(`Cours importé : ${r.numPages} pages${r.analysis.emptyPages ? `, ${r.analysis.emptyPages} sans texte` : ''}`)
    })

  const generate = (docId: string, chunks: number) =>
    run('Préparation…', async () => {
      const g = await generateFiche({
        course: COURSES[c].name,
        chapter: label,
        chunks: await loadCourseChunks(store, docId, chunks),
        onProgress: (done, total) => setBusy(`Rédaction de la fiche : partie ${Math.min(done + 1, total)}/${total}…`),
      })
      setDraft({ docId, model: g.model, parts: g.parts })
    })

  const writeProg = async (patch: Record<string, unknown>) => {
    await store.setDoc(`chprog/${id}`, { ...(d.chprog[id] ?? {}), ...patch, course: c, ch: n })
  }
  const saveDraft = () =>
    run('Enregistrement…', async () => {
      if (!draft) return
      await writeProg({ aiFiche: { docId: draft.docId, model: draft.model, created: new Date().toISOString(), parts: draft.parts } })
      setDraft(null)
      toast('Fiche enregistrée')
    })
  const useAsPoints = () => {
    if (!saved || !confirm('Remplacer tes points clés actuels par ceux de la fiche ?')) return
    void run('Enregistrement…', async () => {
      await writeProg({ points: ficheKeyPoints(saved.parts) })
      toast('Points clés remplacés')
    })
  }
  const removeFiche = () => {
    if (!confirm('Supprimer la fiche IA de ce chapitre ?')) return
    void run('Suppression…', async () => {
      await writeProg({ aiFiche: undefined })
    })
  }
  const removeDoc = (docId: string, chunks: number) => {
    if (!confirm('Supprimer ce cours importé ? Le texte enregistré sera effacé.')) return
    void run('Suppression…', () => deleteCourseDoc(store, docId, chunks))
  }

  return (
    <div className="stack-sm" style={{ marginTop: 12 }}>
      <div className="eyebrow">Cours en PDF · fiche IA</div>
      <input ref={file} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importPdf(f); e.target.value = '' }} />
      {docs.map(([docId, x]) => (
        <div key={docId} className="rd-src">
          <b className="small">📄 {x.name}</b>
          <div className="small muted">{x.pages} pages · importé le {fmtDay(x.created.slice(0, 10))}</div>
          <div className="row" style={{ marginTop: 6 }}>
            <button className="btn primary" disabled={!!busy} onClick={() => void generate(docId, x.chunks)}>✨ Générer la fiche</button>
            <button className="btn ghost" disabled={!!busy} onClick={() => removeDoc(docId, x.chunks)}>Supprimer</button>
          </div>
        </div>
      ))}
      <div className="row">
        <button className="btn" disabled={!!busy} onClick={() => file.current?.click()}>＋ Importer un cours (PDF)</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Le texte est lu sur ton appareil, puis envoyé au modèle d’IA pour rédiger la fiche. Un modèle gratuit peut conserver ce qu’il reçoit.</p>
      {busy && <div className="thinking" role="status"><span className="pulse" />{busy}</div>}
      {error && <div className="banner bad" role="alert" style={{ margin: 0 }}>{error}</div>}
      {draft && (
        <div className="card stack-sm">
          <div className="eyebrow">À relire avant d’enregistrer</div>
          <p className="small muted" style={{ margin: 0 }}>Fiche générée par l’IA à partir de ton cours : vérifie-la, elle peut contenir des erreurs.</p>
          <FicheView parts={draft.parts} />
          <div className="row">
            <button className="btn primary" disabled={!!busy} onClick={() => void saveDraft()}>Enregistrer la fiche</button>
            <button className="btn ghost" disabled={!!busy} onClick={() => setDraft(null)}>Jeter</button>
          </div>
        </div>
      )}
      {saved && !draft && (
        <details>
          <summary className="small"><b>Fiche IA</b> <span className="muted">· {saved.parts.length} partie{saved.parts.length > 1 ? 's' : ''} · {fmtDay(saved.created.slice(0, 10))}</span></summary>
          <FicheView parts={saved.parts} />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small" disabled={!!busy} onClick={useAsPoints}>Utiliser comme points clés</button>
            <button className="btn ghost small" disabled={!!busy} onClick={removeFiche}>Supprimer la fiche IA</button>
          </div>
        </details>
      )}
    </div>
  )
}
