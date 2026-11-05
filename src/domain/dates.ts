const pad = (n: number) => String(n).padStart(2, '0')

export const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = (now: Date = new Date()): string => iso(now)

export function parseDay(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function addDays(s: string, n: number): string {
  const d = parseDay(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}
/** Nombre de jours de `a` à `b` (a − b). */
export const dayDiff = (a: string, b: string): number => Math.round((parseDay(a).getTime() - parseDay(b).getTime()) / 864e5)

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export function fmtDay(s: string): string {
  const d = parseDay(s)
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`
}
export function fmtRel(s: string, todayStr: string): string {
  const n = dayDiff(s, todayStr)
  if (n === 0) return "aujourd'hui"
  if (n === 1) return 'demain'
  if (n === -1) return 'hier'
  return n > 0 ? `dans ${n} j` : `il y a ${-n} j`
}
export const monthKey = (todayStr: string): string => todayStr.slice(0, 7)
