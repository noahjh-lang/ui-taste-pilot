import { z } from 'zod';

export const idSchema = z.string().min(1);
export const isoDateTimeSchema = z.string();
/** Calendar date, `YYYY-MM-DD`. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Standard error envelope returned by every endpoint. */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export const okSchema = z.object({ ok: z.literal(true) });
