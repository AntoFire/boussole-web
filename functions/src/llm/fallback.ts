import { LlmError, type LlmProvider } from './provider.js'

/** Essaie le fournisseur principal ; s'il est saturé, indisponible ou trop lent, passe au suivant. */
export function withFallback(primary: LlmProvider, secondary: LlmProvider): LlmProvider {
  return {
    async complete(req) {
      try {
        return await primary.complete(req)
      } catch (e) {
        if (!(e instanceof LlmError)) throw e
        return secondary.complete(req)
      }
    },
  }
}
