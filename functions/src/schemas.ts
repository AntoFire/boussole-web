import { z } from 'zod'

/** Requêtes acceptées par la fonction `ai`. Une entrée par tâche (étapes suivantes : fiche, cards, qcm, explain, tutor). */
export const AiRequest = z.discriminatedUnion('task', [z.strictObject({ task: z.literal('ping') })])
export type AiRequest = z.infer<typeof AiRequest>
