import { eveningMode } from './eveningMode'

// 2026-10-06 = mardi, 10-07 = mercredi, 10-08 = jeudi, 10-10 = samedi
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m)

describe('eveningMode', () => {
  it('mardi dès 18h : lecture seule', () => {
    expect(eveningMode(at(6, 18, 0))).toBe('readonly')
    expect(eveningMode(at(6, 17, 59))).toBe('full')
  })
  it('samedi dès 12h : lecture seule', () => {
    expect(eveningMode(at(10, 12, 0))).toBe('readonly')
    expect(eveningMode(at(10, 11, 59))).toBe('full')
  })
  it('fermé de 23h30 à 5h', () => {
    expect(eveningMode(at(7, 23, 30))).toBe('closed')
    expect(eveningMode(at(8, 4, 59))).toBe('closed')
    expect(eveningMode(at(8, 5, 0))).toBe('full')
    expect(eveningMode(at(7, 23, 29))).toBe('full')
  })
  it('mardi 23h45 : fermé (prime sur la lecture seule)', () => {
    expect(eveningMode(at(6, 23, 45))).toBe('closed')
  })
})
