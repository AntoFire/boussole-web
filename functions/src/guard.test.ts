import { describe, expect, it } from 'vitest'
import { assertAllowed } from './guard.js'

const code = (f: () => unknown) => {
  try {
    f()
  } catch (e) {
    return (e as { code: string }).code
  }
  return 'ok'
}

describe('assertAllowed', () => {
  it('laisse passer le propriétaire', () => {
    expect(assertAllowed({ uid: 'u1', hasAppCheck: false }, 'u1', false)).toBe('u1')
  })
  it('refuse un utilisateur connecté qui n’est pas le propriétaire', () => {
    expect(code(() => assertAllowed({ uid: 'u2', hasAppCheck: true }, 'u1', false))).toBe('permission-denied')
  })
  it('refuse sans connexion', () => {
    expect(code(() => assertAllowed({ hasAppCheck: true }, 'u1', false))).toBe('unauthenticated')
  })
  it('est fermé quand OWNER_UID n’est pas configuré', () => {
    expect(code(() => assertAllowed({ uid: 'u1', hasAppCheck: true }, '', false))).toBe('failed-precondition')
  })
  it('exige App Check quand il est imposé', () => {
    expect(code(() => assertAllowed({ uid: 'u1', hasAppCheck: false }, 'u1', true))).toBe('failed-precondition')
    expect(code(() => assertAllowed({ uid: 'u1', hasAppCheck: true }, 'u1', true))).toBe('ok')
  })
})
