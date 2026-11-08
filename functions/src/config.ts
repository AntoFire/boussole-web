import { defineBoolean, defineInt, defineSecret, defineString } from 'firebase-functions/params'

export const REGION = 'northamerica-northeast1' // même région que Firestore
export const OPENROUTER_API_KEY = defineSecret('OPENROUTER_API_KEY')
/** UID du propriétaire : seule source de vérité des droits (VITE_OWNER_UID côté appli n'est qu'un confort d'interface). */
export const OWNER_UID = defineString('OWNER_UID')
export const AI_MODEL = defineString('AI_MODEL', { default: 'google/gemma-4-31b-it:free' })
/** Modèle de repli si le principal est saturé ou indisponible (vide = pas de repli). */
export const AI_MODEL_FALLBACK = defineString('AI_MODEL_FALLBACK', { default: 'google/gemma-4-26b-a4b-it:free' })
export const AI_DB_ID = defineString('AI_DB_ID', { default: 'boussole' })
export const LIMIT_PER_MIN = defineInt('AI_LIMIT_PER_MIN', { default: 5 })
export const LIMIT_PER_DAY = defineInt('AI_LIMIT_PER_DAY', { default: 40 })
export const ENFORCE_APPCHECK = defineBoolean('AI_ENFORCE_APPCHECK', { default: false })

/** Fuseau pour le « jour » du quota quotidien. */
export const QUOTA_TZ = 'America/Toronto'
