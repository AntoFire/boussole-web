import { initializeApp, getApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { AI_DB_ID, AI_MODEL, ENFORCE_APPCHECK, LIMIT_PER_DAY, LIMIT_PER_MIN, OPENROUTER_API_KEY, OWNER_UID, QUOTA_TZ, REGION } from './config.js'
import { assertAllowed } from './guard.js'
import { createOpenRouter } from './llm/openrouter.js'
import { LlmError, type LlmProvider } from './llm/provider.js'
import { AiRequest } from './schemas.js'
import { dayKey, reserveCall, type Usage } from './usage.js'

if (!getApps().length) initializeApp()

async function reserve(uid: string): Promise<void> {
  const db = getFirestore(getApp(), AI_DB_ID.value())
  const ref = db.collection('aiUsage').doc(uid)
  const now = Date.now()
  const decision = await db.runTransaction(async (tx) => {
    const d = reserveCall((await tx.get(ref)).data() as Usage | undefined, now, dayKey(now, QUOTA_TZ), { perMin: LIMIT_PER_MIN.value(), perDay: LIMIT_PER_DAY.value() })
    if (d.ok) tx.set(ref, d.usage)
    return d
  })
  if (!decision.ok)
    throw new HttpsError('resource-exhausted', decision.reason === 'day' ? 'Plafond quotidien atteint' : 'Trop de requêtes, réessaie dans un instant', { reason: decision.reason, retryAfterSec: decision.retryAfterSec })
}

function toHttps(e: unknown): HttpsError {
  if (e instanceof HttpsError) return e
  if (e instanceof LlmError) {
    if (e.code === 'rate-limited') return new HttpsError('resource-exhausted', 'Quota du modèle atteint', { reason: 'model' })
    if (e.code === 'timeout') return new HttpsError('deadline-exceeded', 'Le modèle a mis trop de temps')
    if (e.code === 'empty') return new HttpsError('unavailable', 'Réponse vide du modèle', { reason: 'empty' })
    return new HttpsError('unavailable', 'Le modèle est indisponible', { reason: 'upstream', status: e.status })
  }
  return new HttpsError('internal', 'Erreur interne')
}

/** Point d'entrée unique de l'IA : contrôle d'accès, validation, quota, puis tâche. */
export const ai = onCall(
  { region: REGION, secrets: [OPENROUTER_API_KEY], timeoutSeconds: 120, memory: '256MiB', maxInstances: 2, enforceAppCheck: false },
  async (request) => {
    const t0 = Date.now()
    let task = 'unknown'
    try {
      const uid = assertAllowed({ uid: request.auth?.uid, hasAppCheck: !!request.app }, OWNER_UID.value(), ENFORCE_APPCHECK.value())
      const parsed = AiRequest.safeParse(request.data)
      if (!parsed.success) throw new HttpsError('invalid-argument', 'Requête invalide')
      const req = parsed.data
      task = req.task
      await reserve(uid)
      const llm: LlmProvider = createOpenRouter({ apiKey: OPENROUTER_API_KEY.value(), model: AI_MODEL.value() })
      switch (req.task) {
        case 'ping': {
          const r = await llm.complete({ messages: [{ role: 'user', content: 'Réponds uniquement par le mot : pong' }], maxTokens: 512, temperature: 0 })
          logger.info('ai', { task, ms: Date.now() - t0, ok: true, promptTokens: r.promptTokens, completionTokens: r.completionTokens })
          return { task: 'ping' as const, text: r.text.slice(0, 200), model: r.model, ms: Date.now() - t0 }
        }
      }
    } catch (e) {
      const err = toHttps(e)
      logger.warn('ai', { task, ms: Date.now() - t0, ok: false, code: err.code, llm: e instanceof LlmError ? { code: e.code, status: e.status } : undefined })
      throw err
    }
  },
)
