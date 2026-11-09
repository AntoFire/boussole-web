import { describe, expect, it } from 'vitest'
import { AiRequest } from './schemas.js'

describe('AiRequest', () => {
  it('accepte ping', () => expect(AiRequest.safeParse({ task: 'ping' }).success).toBe(true))
  it('valide la tâche fiche : texte borné, champs obligatoires', () => {
    const ok = { task: 'fiche', course: 'NLP', chapter: 'Embeddings', text: 'x'.repeat(300) }
    expect(AiRequest.safeParse(ok).success).toBe(true)
    expect(AiRequest.safeParse({ ...ok, text: 'court' }).success).toBe(false)
    expect(AiRequest.safeParse({ ...ok, text: 'x'.repeat(60_001) }).success).toBe(false)
    expect(AiRequest.safeParse({ ...ok, course: '' }).success).toBe(false)
    expect(AiRequest.safeParse({ ...ok, model: 'gpt-x' }).success).toBe(false)
  })
  it('refuse une tâche inconnue, un champ en trop, et autre chose qu’un objet', () => {
    expect(AiRequest.safeParse({ task: 'rm -rf' }).success).toBe(false)
    expect(AiRequest.safeParse({ task: 'ping', uid: 'x' }).success).toBe(false)
    expect(AiRequest.safeParse('ping').success).toBe(false)
    expect(AiRequest.safeParse(null).success).toBe(false)
  })
})
