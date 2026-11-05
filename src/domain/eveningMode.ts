export type EveningMode = 'closed' | 'readonly' | 'full'

/** Garde-fous : fermé ≥ 23h30 ou < 5h ; lecture seule mardi ≥ 18h et samedi ≥ 12h. */
export function eveningMode(d: Date): EveningMode {
  const h = d.getHours() + d.getMinutes() / 60
  const wd = d.getDay()
  if (h >= 23.5 || h < 5) return 'closed'
  if (wd === 2 && h >= 18) return 'readonly'
  if (wd === 6 && h >= 12) return 'readonly'
  return 'full'
}
