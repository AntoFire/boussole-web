import { expect, it } from 'vitest'
import { RULES, ruleOfDay } from './rules'
it('tourne sur les jours et reste dans la liste', () => {
  expect(RULES).toContain(ruleOfDay('2026-10-07'))
  expect(ruleOfDay('2026-10-07')).not.toBe(ruleOfDay('2026-10-08'))
  expect(ruleOfDay('2025-01-01')).toBeTruthy()
})
