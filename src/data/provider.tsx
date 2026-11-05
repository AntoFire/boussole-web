import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { LocalStore } from './localStore'
import type { DataStore } from './store'

const StoreContext = createContext<DataStore | null>(null)

export function useStore(): DataStore {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return s
}

type State =
  | { status: 'loading' }
  | { status: 'signin'; error?: string }
  | { status: 'denied' }
  | { status: 'error'; error: string }
  | { status: 'ready'; store: DataStore; signOut?: () => void }

const backend = (import.meta.env.VITE_DATA_BACKEND as string | undefined) ?? 'local'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let off: (() => void) | undefined
    let cancelled = false
    if (backend !== 'firebase') {
      LocalStore.create()
        .then((store) => !cancelled && setState({ status: 'ready', store }))
        .catch((e: Error) => !cancelled && setState({ status: 'error', error: e.message }))
    } else {
      void (async () => {
        try {
          const boot = await import('./firebaseBoot')
          const { createFirestoreStore } = await import('./firestoreStore')
          off = boot.watchAuth(async (user) => {
            if (cancelled) return
            if (!user) return setState({ status: 'signin' })
            const owner = import.meta.env.VITE_OWNER_UID as string | undefined
            if (owner && user.uid !== owner) return setState({ status: 'denied' })
            const store = await createFirestoreStore(boot.db(), user.uid)
            if (!cancelled) setState({ status: 'ready', store, signOut: () => void boot.signOutUser() })
          })
        } catch (e) {
          if (!cancelled) setState({ status: 'error', error: (e as Error).message })
        }
      })()
    }
    return () => {
      cancelled = true
      off?.()
    }
  }, [])

  if (state.status === 'loading') return <div className="thinking" style={{ padding: 24 }}><span className="pulse" />Chargement…</div>
  if (state.status === 'error') return <div className="banner bad" style={{ margin: 24 }}>{state.error}</div>
  if (state.status === 'denied') return <div className="banner bad" style={{ margin: 24 }}>Ce compte n’a pas accès à Boussole.</div>
  if (state.status === 'signin') {
    return (
      <div className="card" style={{ margin: '15vh auto', maxWidth: 360, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24 }}>Boussole</h1>
        <p className="muted">Connecte-toi avec ton compte Google.</p>
        <button className="btn primary" onClick={() => void import('./firebaseBoot').then((b) => b.signInGoogle())}>
          Se connecter avec Google
        </button>
      </div>
    )
  }
  return <StoreContext.Provider value={state.store}>{children}</StoreContext.Provider>
}
