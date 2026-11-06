import { describe, expect, it } from 'vitest'
import { dayKey, reserveCall, type Usage } from './usage.js'

const lim = { perMin: 2, perDay: 3 }
const T = 1_000_000

describe('reserveCall', () => {
  it('démarre à zéro', () => {
    const r = reserveCall(undefined, T, '2026-11-06', lim)
    expect(r).toEqual({ ok: true, usage: { minStart: T, minCount: 1, day: '2026-11-06', dayCount: 1 } })
  })
  it('refuse au-delà du plafond par minute puis rouvre après 60 s', () => {
    let u: Usage | undefined
    for (let i = 0; i < 2; i++) {
      const r = reserveCall(u, T + i, 'd', lim)
      expect(r.ok).toBe(true)
      u = r.ok ? r.usage : u
    }
    const refused = reserveCall(u, T + 10_000, 'd', lim)
    expect(refused).toMatchObject({ ok: false, reason: 'minute', retryAfterSec: 50 })
    expect(reserveCall(u, T + 61_000, 'd', lim).ok).toBe(true)
  })
  it('refuse au-delà du plafond quotidien et repart le lendemain', () => {
    const u: Usage = { minStart: T, minCount: 0, day: 'd1', dayCount: 3 }
    expect(reserveCall(u, T + 120_000, 'd1', lim)).toMatchObject({ ok: false, reason: 'day' })
    expect(reserveCall(u, T + 120_000, 'd2', lim).ok).toBe(true)
  })
})

describe('dayKey', () => {
  it('donne le jour local du fuseau', () => {
    expect(dayKey(Date.UTC(2026, 10, 7, 3, 0), 'America/Toronto')).toBe('2026-11-06')
  })
})
