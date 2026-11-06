export type AiErrorKind = 'local' | 'auth' | 'denied' | 'rate' | 'quota' | 'model-quota' | 'timeout' | 'unavailable' | 'invalid' | 'invalid-output' | 'unknown'

/** Erreur de l'IA avec un message prêt à afficher. */
export class AiError extends Error {
  readonly kind: AiErrorKind
  constructor(kind: AiErrorKind, message: string) {
    super(message)
    this.name = 'AiError'
    this.kind = kind
  }
}

const MESSAGES: Record<AiErrorKind, string> = {
  local: 'L’IA n’est disponible qu’avec Firebase (pas en mode local).',
  auth: 'Reconnecte-toi pour utiliser l’IA.',
  denied: 'L’IA est réservée au propriétaire de Boussole.',
  rate: 'Trop de demandes d’affilée : réessaie dans un instant.',
  quota: 'Plafond quotidien d’appels IA atteint. Réessaie demain.',
  'model-quota': 'Le modèle gratuit a atteint sa limite. Réessaie plus tard.',
  timeout: 'Le modèle met trop de temps à répondre. Réessaie.',
  unavailable: 'Le modèle est indisponible pour le moment.',
  invalid: 'Demande refusée par le serveur.',
  'invalid-output': 'Réponse inattendue du serveur.',
  unknown: 'Erreur inattendue de l’IA.',
}

/** Traduit une erreur de Firebase Functions (code « functions/… ») en erreur affichable. */
export function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e
  const code = String((e as { code?: unknown })?.code ?? '').replace('functions/', '')
  const reason = (e as { details?: { reason?: unknown } })?.details?.reason
  const kind: AiErrorKind =
    code === 'unauthenticated' ? 'auth'
    : code === 'permission-denied' ? 'denied'
    : code === 'resource-exhausted' ? (reason === 'day' ? 'quota' : reason === 'model' ? 'model-quota' : 'rate')
    : code === 'deadline-exceeded' ? 'timeout'
    : code === 'unavailable' ? 'unavailable'
    : code === 'invalid-argument' ? 'invalid'
    : code === 'failed-precondition' ? 'denied'
    : 'unknown'
  return new AiError(kind, MESSAGES[kind])
}

export const aiMessage = (k: AiErrorKind) => MESSAGES[k]
