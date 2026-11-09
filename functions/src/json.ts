/** Extrait un objet JSON d'une réponse de modèle : balises ```json, texte autour, etc. Renvoie undefined si rien d'exploitable. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : text
  const a = body.indexOf('{')
  const b = body.lastIndexOf('}')
  if (a < 0 || b <= a) return undefined
  try {
    return JSON.parse(body.slice(a, b + 1))
  } catch {
    return undefined
  }
}
