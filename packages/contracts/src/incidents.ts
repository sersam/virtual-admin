import { z } from 'zod';
import { AiProviderModeSchema } from './communications.js';

export const IncidentTypeSchema = z.enum([
  'agua',
  'electricidad',
  'ascensor',
  'limpieza',
  'seguridad',
  'convivencia',
  'otro',
]);

export const IncidentPrioritySchema = z.enum(['baja', 'media', 'alta', 'urgente']);
export const IncidentStatusSchema = z.enum(['pendiente', 'resuelta']);

export const CreateIncidentRequestSchema = z.object({
  description: z.string().trim().min(10).max(1_000),
});

const IncidentBaseSchema = z.object({
  id: z.string().trim().min(1).max(80),
  description: z.string().trim().min(10).max(1_000),
  type: IncidentTypeSchema,
  priority: IncidentPrioritySchema,
  suggestedResponsible: z.string().trim().min(1).max(120),
  suggestedNotice: z.string().trim().min(1).max(2_000),
  createdAt: z.iso.datetime(),
});

export const IncidentSchema = IncidentBaseSchema.and(
  z.discriminatedUnion('status', [
    z.object({ status: z.literal('pendiente'), resolvedAt: z.null() }),
    z.object({ status: z.literal('resuelta'), resolvedAt: z.iso.datetime() }),
  ]),
);

export const CreateIncidentResponseSchema = z.object({
  incident: IncidentSchema,
  mode: AiProviderModeSchema,
});

export const IncidentListQuerySchema = z.object({
  type: IncidentTypeSchema.optional(),
});

export const IncidentListResponseSchema = z.object({
  incidents: z.array(IncidentSchema),
});

export const ResolveIncidentParamsSchema = z.object({
  incidentId: z.string().trim().min(1).max(80),
});

export const ResolveIncidentResponseSchema = z.object({
  incident: IncidentSchema,
});

export type IncidentType = z.infer<typeof IncidentTypeSchema>;
export type IncidentPriority = z.infer<typeof IncidentPrioritySchema>;
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type CreateIncidentRequest = z.infer<typeof CreateIncidentRequestSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type CreateIncidentResponse = z.infer<typeof CreateIncidentResponseSchema>;
export type IncidentListQuery = z.infer<typeof IncidentListQuerySchema>;
export type IncidentListResponse = z.infer<typeof IncidentListResponseSchema>;
export type ResolveIncidentParams = z.infer<typeof ResolveIncidentParamsSchema>;
export type ResolveIncidentResponse = z.infer<typeof ResolveIncidentResponseSchema>;
