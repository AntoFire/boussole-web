import { AiError, aiMessage, toAiError } from './errors'
import { AiResponse, type AiRequest } from './types'

const backend = (import.meta.env.VITE_DATA_BACKEND as string | undefined) ?? 'local'

/**
 * Appelle la fonction `ai` (Firebase Functions → OpenRouter). Aucune clé ici : tout passe par le serveur,
 * qui vérifie lui-même l'identité. La réponse est validée avant d'être rendue.
 */
export async function callAi<T extends AiRequest['task']>(req: Extract<AiRequest, { task: T }>): Promise<Extract<AiResponse, { task: T }>> {
  if (backend !== 'firebase') throw new AiError('local', aiMessage('local'))
  try {
    const [boot, fns] = await Promise.all([import('../data/firebaseBoot'), import('firebase/functions')])
    const call = fns.httpsCallable(boot.functionsClient(), 'ai', { timeout: 310_000 })
    const parsed = AiResponse.safeParse((await call(req)).data)
    if (!parsed.success || parsed.data.task !== req.task) throw new AiError('invalid-output', aiMessage('invalid-output'))
    return parsed.data as Extract<AiResponse, { task: T }>
  } catch (e) {
    throw toAiError(e)
  }
}
