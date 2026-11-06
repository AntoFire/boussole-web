import { LlmError, type LlmProvider, type LlmRequest, type LlmResult } from './provider.js'

export interface OpenRouterOptions {
  apiKey: string
  model: string
  fetchImpl?: typeof fetch
  defaultTimeoutMs?: number
}

const URL = 'https://openrouter.ai/api/v1/chat/completions'

interface ApiBody {
  model?: string
  choices?: { message?: { content?: string | null } }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { code?: number | string }
}

/** Retire les blocs de raisonnement que certains modèles laissent dans la réponse. */
export function stripThinking(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

export function createOpenRouter(o: OpenRouterOptions): LlmProvider {
  const doFetch = o.fetchImpl ?? fetch
  return {
    async complete(req: LlmRequest): Promise<LlmResult> {
      const ctl = new AbortController()
      const timer = setTimeout(() => ctl.abort(), req.timeoutMs ?? o.defaultTimeoutMs ?? 90_000)
      let res: Response
      try {
        res = await doFetch(URL, {
          method: 'POST',
          signal: ctl.signal,
          headers: {
            Authorization: `Bearer ${o.apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'Boussole',
          },
          body: JSON.stringify({
            model: o.model,
            messages: req.messages,
            max_tokens: req.maxTokens ?? 1024,
            temperature: req.temperature ?? 0.3,
            ...(req.json ? { response_format: { type: 'json_object' } } : {}),
          }),
        })
      } catch (e) {
        if ((e as Error).name === 'AbortError') throw new LlmError('timeout', 'Le modèle n’a pas répondu à temps')
        throw new LlmError('upstream', 'Fournisseur injoignable')
      } finally {
        clearTimeout(timer)
      }
      if (res.status === 429) throw new LlmError('rate-limited', 'Quota du modèle atteint', 429)
      if (!res.ok) throw new LlmError('upstream', `Le fournisseur a répondu ${res.status}`, res.status)
      const body = (await res.json().catch(() => null)) as ApiBody | null
      // OpenRouter peut répondre 200 avec un objet { error } (modèle indisponible, limite amont…)
      if (body?.error) {
        const limited = body.error.code === 429
        throw new LlmError(limited ? 'rate-limited' : 'upstream', limited ? 'Quota du modèle atteint' : 'Erreur du fournisseur', Number(body.error.code) || undefined)
      }
      const text = stripThinking(body?.choices?.[0]?.message?.content ?? '')
      if (!text) throw new LlmError('empty', 'Réponse vide du modèle')
      return {
        text,
        model: body?.model ?? o.model,
        promptTokens: body?.usage?.prompt_tokens,
        completionTokens: body?.usage?.completion_tokens,
      }
    },
  }
}
