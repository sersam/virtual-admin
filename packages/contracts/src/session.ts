import { z } from 'zod';

export const SessionIdSchema = z.uuid();

export const DemoSessionSchema = z.object({
  id: SessionIdSchema,
  createdAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  requestsUsed: z.number().int().min(0),
  requestsLimit: z.number().int().positive(),
});

export const SessionModeSchema = z.enum(['api', 'local-demo']);

export const SessionResponseSchema = z.object({
  session: DemoSessionSchema,
  mode: SessionModeSchema,
});

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('administrador-virtual-api'),
  version: z.string().min(1),
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});

export type DemoSession = z.infer<typeof DemoSessionSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
