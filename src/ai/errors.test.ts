import { describe, expect, it } from 'vitest'
import { AiError, toAiError } from './errors'
import { AiResponse } from './types'

describe('toAiError', () => {
  const k = (code: string, reason?: string) => toAiError({ code: `functions/${code}`, details: reason ? { reason } : undefined }).kind
  it('traduit les codes Firebase', () => {
    expect(k('unauthenticated')).toBe('auth')
    expect(k('permission-denied')).toBe('denied')
    expect(k('deadline-exceeded')).toBe('timeout')
    expect(k('unavailable')).toBe('unavailable')
    expect(k('invalid-argument')).toBe('invalid')
    expect(k('internal')).toBe('unknown')
  })
  it('distingue les trois « resource-exhausted »', () => {
    expect(k('resource-exhausted', 'day')).toBe('quota')
    expect(k('resource-exhausted', 'model')).toBe('model-quota')
    expect(k('resource-exhausted', 'minute')).toBe('rate')
  })
  it('garde une AiError telle quelle et ne fuit rien d’une erreur inconnue', () => {
    const a = new AiError('local', 'x')
    expect(toAiError(a)).toBe(a)
    expect(toAiError(new Error('sk-secret')).message).not.toContain('sk-secret')
  })
})

describe('AiResponse', () => {
  it('valide la réponse ping et rejette le reste', () => {
    expect(AiResponse.safeParse({ task: 'ping', text: 'pong', model: 'm', ms: 12 }).success).toBe(true)
    expect(AiResponse.safeParse({ task: 'ping', text: 1 }).success).toBe(false)
    expect(AiResponse.safeParse({ task: 'autre' }).success).toBe(false)
  })
})
