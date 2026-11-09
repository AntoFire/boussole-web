import { z } from 'zod'

/** Requêtes acceptées par la fonction `ai`. Une entrée par tâche (étapes suivantes : fiche, cards, qcm, explain, tutor). */
/** Taille maximale du texte d'un cours envoyé en un appel (le client découpe au-delà). */
export const MAX_COURSE_CHARS = 60_000

export const AiRequest = z.discriminatedUnion('task', [
  z.strictObject({ task: z.literal('ping') }),
  z.strictObject({
    task: z.literal('fiche'),
    course: z.string().trim().min(1).max(100),
    chapter: z.string().trim().min(1).max(200),
    text: z.string().min(200).max(MAX_COURSE_CHARS),
  }),
])
export type AiRequest = z.infer<typeof AiRequest>
