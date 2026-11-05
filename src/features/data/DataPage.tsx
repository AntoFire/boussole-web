import { useRef } from 'react'
import { useToast } from '../../components/Toast'
import { useStore } from '../../data/provider'
import { LocalStore } from '../../data/localStore'
import type { Dump } from '../../data/store'

export function DataPage() {
  const store = useStore()
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)

  const exportJson = async () => {
    const dump = await store.exportAll()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json' }))
    a.download = `boussole-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Export téléchargé')
  }
  const importJson = async (f: File) => {
    try {
      const dump = JSON.parse(await f.text()) as Dump
      if (typeof dump !== 'object' || dump === null || Array.isArray(dump)) throw new Error('Format inattendu')
      if (!confirm('Importer ce fichier remplacera les documents portant le même identifiant. Continuer ?')) return
      await store.importAll(dump)
      toast('Import terminé')
    } catch (e) {
      toast('Import impossible : ' + (e as Error).message)
    }
  }
  return (
    <div className="stack">
      <div className="page-head"><h1>Données</h1></div>
      <div className="card stack-sm">
        <div className="eyebrow">Stockage</div>
        <p>{store.kind === 'firebase' ? 'Firebase (synchronisé sur tes appareils).' : 'Local : les données restent dans ce navigateur (mode développement / démo).'}</p>
      </div>
      <div className="card stack-sm">
        <div className="eyebrow">Sauvegarde</div>
        <div className="row">
          <button className="btn primary" onClick={() => void exportJson()}>Exporter en JSON</button>
          <button className="btn" onClick={() => file.current?.click()}>Importer un JSON</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = '' }} />
        </div>
      </div>
      {store instanceof LocalStore && (
        <div className="card stack-sm">
          <div className="eyebrow">Démo</div>
          <button className="btn" onClick={() => { if (confirm('Revenir aux données de départ ? Tes changements locaux seront perdus.')) { LocalStore.reset(); location.reload() } }}>Réinitialiser les données locales</button>
        </div>
      )}
    </div>
  )
}
