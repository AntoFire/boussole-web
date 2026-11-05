import { initializeApp, type FirebaseApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, type Firestore } from 'firebase/firestore'

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
  return app
}

export function db(): Firestore {
  if (!firestore) firestore = initializeFirestore(init(), { localCache: persistentLocalCache() })
  return firestore
}
export const watchAuth = (cb: (u: User | null) => void) => onAuthStateChanged(getAuth(init()), cb)
export const signInGoogle = () => signInWithPopup(getAuth(init()), new GoogleAuthProvider())
export const signOutUser = () => signOut(getAuth(init()))
