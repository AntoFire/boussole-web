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
  readonly code: LlmErrorCode
  readonly status?: number
  /** Message court renvoyé par le fournisseur (jamais la clé ni le contenu envoyé) */
  readonly detail?: string
  constructor(code: LlmErrorCode, message: string, status?: number, detail?: string) {
    super(message)
    this.name = 'LlmError'
    this.code = code
    this.status = status
    this.detail = detail
  }
}
