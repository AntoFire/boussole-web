import { z } from 'zod'

/** Requêtes et réponses de la fonction `ai`. Miroir de functions/src/schemas.ts ; la réponse est validée avant d'atteindre l'interface. */
export type AiRequest = { task: 'ping' }

export const AiResponse = z.discriminatedUnion('task', [
  z.object({ task: z.literal('ping'), text: z.string(), model: z.string(), ms: z.number() }),
])
export type AiResponse = z.infer<typeof AiResponse>
