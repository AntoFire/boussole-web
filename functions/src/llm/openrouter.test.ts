import { describe, expect, it, vi } from 'vitest'
import { createOpenRouter, stripThinking } from './openrouter.js'
import { LlmError } from './provider.js'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const make = (f: typeof fetch) => createOpenRouter({ apiKey: 'sk-secret', model: 'm/x:free', fetchImpl: f })
const req = { messages: [{ role: 'user' as const, content: 'salut' }] }
const fail = async (p: Promise<unknown>) => {
  try {
    await p
  } catch (e) {
    return e as LlmError
  }
  throw new Error('aucune erreur')
}

describe('openrouter', () => {
  it('envoie le modèle et la clé, renvoie le texte', async () => {
    const f = vi.fn(async () => json({ model: 'm/x:free', choices: [{ message: { content: ' pong ' } }], usage: { prompt_tokens: 5, completion_tokens: 1 } }))
    const r = await make(f as unknown as typeof fetch).complete({ ...req, json: true })
    expect(r).toMatchObject({ text: 'pong', promptTokens: 5, completionTokens: 1 })
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('openrouter.ai')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-secret')
    expect(JSON.parse(init.body as string)).toMatchObject({ model: 'm/x:free', response_format: { type: 'json_object' } })
  })
  it('retire les blocs <think>', () => {
    expect(stripThinking('<think>hum\nhum</think>\nRéponse')).toBe('Réponse')
  })
  it('traduit 429, erreurs HTTP et erreurs 200 déguisées', async () => {
    expect((await fail(make((async () => json({}, 429)) as typeof fetch).complete(req))).code).toBe('rate-limited')
    expect((await fail(make((async () => json({}, 503)) as typeof fetch).complete(req))).code).toBe('upstream')
    expect((await fail(make((async () => json({ error: { code: 429 } })) as typeof fetch).complete(req))).code).toBe('rate-limited')
    expect((await fail(make((async () => json({ choices: [{ message: { content: '' } }] })) as typeof fetch).complete(req))).code).toBe('empty')
  })
  it('garde le message du fournisseur sans la clé', async () => {
    const e = await fail(make((async () => json({ error: { code: 404, message: 'No endpoints found matching your data policy' } }, 404)) as typeof fetch).complete(req))
    expect(e).toMatchObject({ code: 'upstream', status: 404, detail: 'No endpoints found matching your data policy' })
    expect(JSON.stringify(e)).not.toContain('sk-secret')
  })
  it('garde le message d’une erreur 429', async () => {
    const e = await fail(make((async () => json({ error: { message: 'Rate limit exceeded: free-models-per-day' } }, 429)) as typeof fetch).complete(req))
    expect(e).toMatchObject({ code: 'rate-limited', detail: 'Rate limit exceeded: free-models-per-day' })
  })
  it('expire sur délai dépassé sans fuir la clé', async () => {
    const slow = ((_u: string, init: RequestInit) => new Promise((_res, rej) => init.signal!.addEventListener('abort', () => rej(Object.assign(new Error('x'), { name: 'AbortError' }))))) as unknown as typeof fetch
    const e = await fail(make(slow).complete({ ...req, timeoutMs: 10 }))
    expect(e.code).toBe('timeout')
    expect(e.message).not.toContain('sk-secret')
  })
})
