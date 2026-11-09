import { initializeApp, getApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { AI_DB_ID, AI_MODEL, AI_MODEL_FALLBACK, ENFORCE_APPCHECK, LIMIT_PER_DAY, LIMIT_PER_MIN, OPENROUTER_API_KEY, OWNER_UID, QUOTA_TZ, REGION } from './config.js'
import { assertAllowed } from './guard.js'
import { withFallback } from './llm/fallback.js'
import { createOpenRouter } from './llm/openrouter.js'
import { LlmError, type LlmProvider } from './llm/provider.js'
import { AiRequest } from './schemas.js'
import { InvalidOutputError, runFiche } from './tasks/fiche.js'
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
  if (e instanceof InvalidOutputError) return new HttpsError('internal', 'Sortie du modèle invalide', { reason: 'invalid-output' })
  if (e instanceof LlmError) {
    if (e.code === 'rate-limited') return new HttpsError('resource-exhausted', 'Quota du modèle atteint', { reason: 'model', detail: e.detail })
    if (e.code === 'timeout') return new HttpsError('deadline-exceeded', 'Le modèle a mis trop de temps')
    if (e.code === 'empty') return new HttpsError('unavailable', 'Réponse vide du modèle', { reason: 'empty' })
    return new HttpsError('unavailable', 'Le modèle est indisponible', { reason: 'upstream', status: e.status, detail: e.detail })
  }
  return new HttpsError('internal', 'Erreur interne')
}

/** Point d'entrée unique de l'IA : contrôle d'accès, validation, quota, puis tâche. */
export const ai = onCall(
  { region: REGION, secrets: [OPENROUTER_API_KEY], timeoutSeconds: 300, memory: '256MiB', maxInstances: 2, enforceAppCheck: false },
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
      const apiKey = OPENROUTER_API_KEY.value()
      const main = createOpenRouter({ apiKey, model: AI_MODEL.value() })
      const spare = AI_MODEL_FALLBACK.value()
      const llm: LlmProvider = spare && spare !== AI_MODEL.value() ? withFallback(main, createOpenRouter({ apiKey, model: spare })) : main
      switch (req.task) {
        case 'ping': {
          const r = await llm.complete({ messages: [{ role: 'user', content: 'Réponds uniquement par le mot : pong' }], maxTokens: 512, temperature: 0 })
          logger.info('ai', { task, ms: Date.now() - t0, ok: true, promptTokens: r.promptTokens, completionTokens: r.completionTokens })
          return { task: 'ping' as const, text: r.text.slice(0, 200), model: r.model, ms: Date.now() - t0 }
        }
        case 'fiche': {
          const r = await runFiche(llm, { course: req.course, chapter: req.chapter, text: req.text })
          logger.info('ai', { task, ms: Date.now() - t0, ok: true, chars: req.text.length })
          return { task: 'fiche' as const, fiche: r.fiche, model: r.model, ms: Date.now() - t0 }
        }
      }
    } catch (e) {
      const err = toHttps(e)
      // cause des exceptions imprévues (jamais le texte du cours : les messages d'erreur n'en contiennent pas)
      const bug = e instanceof HttpsError || e instanceof LlmError || e instanceof InvalidOutputError ? undefined : e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 300) : String(e).slice(0, 300)
      logger.warn('ai', { task, ms: Date.now() - t0, ok: false, code: err.code, bug, llm: e instanceof LlmError ? { code: e.code, status: e.status, detail: e.detail } : undefined })
      throw err
    }
  },
)
