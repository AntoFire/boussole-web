import { initializeApp, type FirebaseApp } from 'firebase/app'
import { ReCaptchaV3Provider, initializeAppCheck } from 'firebase/app-check'
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, type Firestore } from 'firebase/firestore'
import { getFunctions, type Functions } from 'firebase/functions'

let app: FirebaseApp | null = null
let firestore: Firestore | null = null

function init(): FirebaseApp {
  if (app) return app
  const env = import.meta.env
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID) {
    throw new Error('Configuration Firebase absente : renseigne les variables VITE_FIREBASE_* (voir .env.example).')
  }
  app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  // App Check (reCAPTCHA v3) : défense en profondeur pour les appels IA ; actif seulement si la clé de site est fournie.
  if (env.VITE_APPCHECK_SITE_KEY) {
    // en développement, un jeton de debug s'affiche dans la console (à enregistrer dans la console Firebase)
    if (env.DEV) (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(env.VITE_APPCHECK_SITE_KEY), isTokenAutoRefreshEnabled: true })
  }
  return app
}

/** Cloud Functions, dans la région de la base Firestore. */
export const functionsClient = (): Functions => getFunctions(init(), 'northamerica-northeast1')

export function db(): Firestore {
  // base nommée (ex. « boussole ») si VITE_FIREBASE_DATABASE_ID est renseigné, sinon la base « (default) »
  const dbId = (import.meta.env.VITE_FIREBASE_DATABASE_ID as string | undefined) || '(default)'
  if (!firestore) firestore = initializeFirestore(init(), { localCache: persistentLocalCache() }, dbId)
  return firestore
}
export const watchAuth = (cb: (u: User | null) => void) => onAuthStateChanged(getAuth(init()), cb)
export const signInGoogle = () => signInWithPopup(getAuth(init()), new GoogleAuthProvider())
export const signOutUser = () => signOut(getAuth(init()))
