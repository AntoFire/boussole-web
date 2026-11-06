import { describe, expect, it } from 'vitest'
import { AiRequest } from './schemas.js'

describe('AiRequest', () => {
  it('accepte ping', () => expect(AiRequest.safeParse({ task: 'ping' }).success).toBe(true))
  it('refuse une tâche inconnue, un champ en trop, et autre chose qu’un objet', () => {
    expect(AiRequest.safeParse({ task: 'rm -rf' }).success).toBe(false)
    expect(AiRequest.safeParse({ task: 'ping', uid: 'x' }).success).toBe(false)
    expect(AiRequest.safeParse('ping').success).toBe(false)
    expect(AiRequest.safeParse(null).success).toBe(false)
  })
})
