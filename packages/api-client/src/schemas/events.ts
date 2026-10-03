import { z } from 'zod';

/** Frontend analytics events, sent to the same pipeline as backend events. */
export const clientEventSchema = z.object({
  name: z.string().min(1).max(80),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  sessionId: z.string(),
  partyId: z.string().nullable(),
  occurredAt: z.string(),
});
export type ClientEvent = z.infer<typeof clientEventSchema>;

export const eventBatchSchema = z.object({ events: z.array(clientEventSchema).max(50) });
