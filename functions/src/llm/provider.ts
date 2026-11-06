/** Contrat minimal d'un fournisseur de modèle. Les tâches pédagogiques ne connaissent que ceci. */
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmRequest {
  messages: LlmMessage[]
  maxTokens?: number
  temperature?: number
  /** Demande une sortie JSON (la validation reste faite par l'appelant). */
  json?: boolean
  timeoutMs?: number
}

export interface LlmResult {
  text: string
  model: string
  promptTokens?: number
  completionTokens?: number
}

export interface LlmProvider {
  complete(req: LlmRequest): Promise<LlmResult>
}

export type LlmErrorCode = 'rate-limited' | 'timeout' | 'upstream' | 'empty'

/** Erreur du fournisseur. Le message ne contient jamais de corps de réponse ni de clé. */
export class LlmError extends Error {
  constructor(
    readonly code: LlmErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'LlmError'
  }
}
