import { describe, expect, it, vi } from 'vitest'
import { withFallback } from './fallback.js'
import { LlmError, type LlmProvider } from './provider.js'

const ok = (text: string): LlmProvider => ({ complete: vi.fn(async () => ({ text, model: text })) })
const ko = (code: 'rate-limited' | 'upstream' | 'timeout' | 'empty'): LlmProvider => ({
  complete: vi.fn(async () => {
    throw new LlmError(code, 'x')
  }),
})

describe('withFallback', () => {
  const req = { messages: [{ role: 'user' as const, content: 'a' }] }
  it('n’appelle pas le repli quand le principal répond', async () => {
    const b = ok('B')
    expect((await withFallback(ok('A'), b).complete(req)).text).toBe('A')
    expect(b.complete).not.toHaveBeenCalled()
  })
  it('bascule sur le repli pour chaque erreur du fournisseur', async () => {
    for (const c of ['rate-limited', 'upstream', 'timeout', 'empty'] as const) expect((await withFallback(ko(c), ok('B')).complete(req)).text).toBe('B')
  })
  it('renvoie l’erreur du repli si les deux échouent, et ne masque pas les autres erreurs', async () => {
    await expect(withFallback(ko('rate-limited'), ko('upstream')).complete(req)).rejects.toMatchObject({ code: 'upstream' })
    const boom: LlmProvider = { complete: async () => { throw new Error('bug') } }
    await expect(withFallback(boom, ok('B')).complete(req)).rejects.toThrow('bug')
  })
})
