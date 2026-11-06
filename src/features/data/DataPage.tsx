import { useRef, useState } from 'react'
import { useToast } from '../../components/Toast'
import { useStore } from '../../data/provider'
import { LocalStore } from '../../data/localStore'
import { planImport, type ImportPlan } from '../../data/importDump'
import { callAi } from '../../ai/client'
import { toAiError } from '../../ai/errors'

const LABELS: Record<string, string> = {
  concepts: 'notions', evals: 'échéances', flash: 'cartes Flash', sources: 'sources', flashcfg: 'réglages des chapitres',
  flashprog: 'progression Flash', journal: 'journal', chprog: 'chapitres', rewards: 'récompenses', exam: 'examens',
  examrun: 'simulations', exambank: 'banque d’exercices', exampm: 'bilans d’examen', baseline: 'tests de départ',
  stats: 'statistiques', bilans: 'bilans',
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' })
}

export function DataPage() {
  const store = useStore()
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<(ImportPlan & { file: string }) | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [aiTest, setAiTest] = useState<{ busy: boolean; msg?: string; bad?: boolean }>({ busy: false })

  const exportJson = async () => {
    const dump = await store.exportAll()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json' }))
    a.download = `boussole-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Export téléchargé')
  }
  const readFile = async (f: File) => {
    setDone(null)
    try {
      setPlan({ ...planImport(JSON.parse(await f.text())), file: f.name })
    } catch (e) {
      setPlan(null)
      toast('Fichier illisible : ' + (e as Error).message)
    }
  }
  const runImport = async () => {
    if (!plan) return
    setBusy(true)
    try {
      await store.importAll(plan.dump)
      setDone(`${plan.total} documents importés depuis ${plan.file}.`)
      setPlan(null)
      toast('Import terminé')
    } catch (e) {
      toast('Import interrompu : ' + (e as Error).message + '. Tu peux relancer, les documents déjà écrits seront simplement remplacés.')
    } finally {
      setBusy(false)
    }
  }
  const testAi = async () => {
    setAiTest({ busy: true })
    try {
      const r = await callAi({ task: 'ping' })
      setAiTest({ busy: false, msg: `Connexion OK · ${r.model} · ${(r.ms / 1000).toFixed(1)} s` })
    } catch (e) {
      setAiTest({ busy: false, bad: true, msg: toAiError(e).message })
    }
  }
  const when = fmtDate(plan?.exportedAt ?? null)
  return (
    <div className="stack">
      <div className="page-head"><h1>Données</h1></div>
      <div className="card stack-sm">
        <div className="eyebrow">Stockage</div>
        <p>{store.kind === 'firebase' ? 'Firebase (synchronisé sur tes appareils).' : 'Local : les données restent dans ce navigateur (mode développement / démo).'}</p>
      </div>
      <div className="card stack-sm">
        <div className="eyebrow">Sauvegarde</div>
        <p className="small muted" style={{ margin: 0 }}>Pour reprendre tes données de l’ancienne Boussole : dans l’artifact, Données → Tout exporter, puis importe ce fichier ici.</p>
        <div className="row">
          <button className="btn primary" onClick={() => void exportJson()}>Exporter en JSON</button>
          <button className="btn" onClick={() => file.current?.click()}>Importer un JSON</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = '' }} />
        </div>
        {done && <div className="banner info" style={{ margin: 0 }}>{done}</div>}
      </div>
      {store.kind === 'firebase' && (
        <div className="card stack-sm">
          <div className="eyebrow">Assistant IA</div>
          <p className="small muted" style={{ margin: 0 }}>Vérifie que la fonction IA répond (clé, modèle et quotas sont gérés côté serveur).</p>
          <div className="row">
            <button className="btn" disabled={aiTest.busy} onClick={() => void testAi()}>{aiTest.busy ? 'Test…' : 'Tester la connexion IA'}</button>
          </div>
          {aiTest.msg && <div className={`banner ${aiTest.bad ? 'bad' : 'info'}`} style={{ margin: 0 }} role="status">{aiTest.msg}</div>}
        </div>
      )}
      {plan && (
        <div className="card stack-sm">
          <div className="eyebrow">À importer</div>
          <p style={{ margin: 0 }}>
            <b>{plan.total} documents</b> dans {plan.file}{when ? `, exporté le ${when}` : ''}.
          </p>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {Object.entries(plan.counts).map(([k, n]) => <li key={k}>{LABELS[k] ?? k} : {n}</li>)}
          </ul>
          {plan.skipped.length > 0 && (
            <details className="small">
              <summary>{plan.skipped.length} élément{plan.skipped.length > 1 ? 's' : ''} laissé{plan.skipped.length > 1 ? 's' : ''} de côté</summary>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{plan.skipped.slice(0, 30).map((s) => <li key={s}>{s}</li>)}</ul>
            </details>
          )}
          <p className="small muted" style={{ margin: 0 }}>Les documents de même identifiant sont remplacés, les autres sont gardés.</p>
          <div className="row">
            <button className="btn primary" disabled={busy} onClick={() => void runImport()}>{busy ? 'Import…' : `Importer ${plan.total} documents`}</button>
            <button className="btn ghost" disabled={busy} onClick={() => setPlan(null)}>Annuler</button>
          </div>
        </div>
      )}
      {store instanceof LocalStore && (
        <div className="card stack-sm">
          <div className="eyebrow">Démo</div>
          <button className="btn" onClick={() => { if (confirm('Revenir aux données de départ ? Tes changements locaux seront perdus.')) { LocalStore.reset(); location.reload() } }}>Réinitialiser les données locales</button>
        </div>
      )}
    </div>
  )
}
