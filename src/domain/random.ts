export type Rng = () => number

/** Mélange de Fisher-Yates, sans modifier le tableau d'entrée. */
export function shuffle<T>(list: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
