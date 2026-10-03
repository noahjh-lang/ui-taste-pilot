import { SAFETY_STATUSES } from '@tastepilot/shared';
import { z } from 'zod';

// PLACEHOLDER: mirrors only the `status` field of the backend's SafetyResult.
// Replace with the real contract (generated or hand-mirrored) once agreed.
export const safetyResultSchema = z.object({
  status: z.enum(SAFETY_STATUSES),
});

export type SafetyResult = z.infer<typeof safetyResultSchema>;
