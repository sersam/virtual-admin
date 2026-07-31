import { z } from 'zod';

export const AiFallbackReasonSchema = z.enum([
  'session-quota',
  'ip-quota',
  'provider-error',
  'quota-unavailable',
]);

export type AiFallbackReason = z.infer<typeof AiFallbackReasonSchema>;
