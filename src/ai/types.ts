import { z } from 'zod'

/** Fiche de révision. Miroir de functions/src/tasks/fiche.ts : la réponse est validée avant d'atteindre l'interface. */
export const Fiche = z.object({
  title: z.string().min(1),
  sections: z.array(
    z.object({
      title: z.string().min(1),
      definitions: z.array(z.object({ term: z.string(), definition: z.string() })).default([]),
      keyPoints: z.array(z.string()).default([]),
      formulas: z.array(z.string()).default([]),
      example: z.string().default(''),
    }),
  ),
  summary: z.string(),
})
export type Fiche = z.infer<typeof Fiche>

/** Requêtes de la fonction `ai`. Miroir de functions/src/schemas.ts. */
export type AiRequest = { task: 'ping' } | { task: 'fiche'; course: string; chapter: string; text: string }

export const AiResponse = z.discriminatedUnion('task', [
  z.object({ task: z.literal('ping'), text: z.string(), model: z.string(), ms: z.number() }),
  z.object({ task: z.literal('fiche'), fiche: Fiche, model: z.string(), ms: z.number() }),
])
export type AiResponse = z.infer<typeof AiResponse>
