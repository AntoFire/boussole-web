import { addDays, dayDiff, fmtDay, fmtRel, iso, monthKey, parseDay } from './dates'

describe('dates', () => {
  it('addDays traverse fin de mois et fin d’année', () => {
    expect(addDays('2026-10-07', 1)).toBe('2026-10-08')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-10-07', -7)).toBe('2026-09-30')
  })
  it('dayDiff(a,b) = a − b en jours', () => {
    expect(dayDiff('2026-10-10', '2026-10-07')).toBe(3)
    expect(dayDiff('2026-10-07', '2026-10-10')).toBe(-3)
    expect(dayDiff('2026-10-07T09:30', '2026-10-07')).toBe(0)
  })
  it('iso/parseDay font l’aller-retour', () => {
    expect(iso(parseDay('2026-02-28'))).toBe('2026-02-28')
  })
  it('formats français', () => {
    expect(fmtDay('2026-10-07')).toBe('mer. 7 oct.')
    expect(fmtRel('2026-10-07', '2026-10-07')).toBe("aujourd'hui")
    expect(fmtRel('2026-10-08', '2026-10-07')).toBe('demain')
    expect(fmtRel('2026-10-06', '2026-10-07')).toBe('hier')
    expect(fmtRel('2026-10-12', '2026-10-07')).toBe('dans 5 j')
    expect(fmtRel('2026-10-02', '2026-10-07')).toBe('il y a 5 j')
  })
  it('monthKey', () => {
    expect(monthKey('2026-10-07')).toBe('2026-10')
  })
})
