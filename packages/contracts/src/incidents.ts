import { z } from 'zod';

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

export const CreateIncidentRequestSchema = z.object({
  description: z.string().trim().min(10).max(1_000),
});

export const IncidentSchema = z.object({
  id: z.string().trim().min(1).max(80),
  description: z.string().trim().min(10).max(1_000),
  type: IncidentTypeSchema,
  priority: IncidentPrioritySchema,
  suggestedResponsible: z.string().trim().min(1).max(120),
  createdAt: z.iso.datetime(),
});

export const CreateIncidentResponseSchema = z.object({
  incident: IncidentSchema,
  mode: z.literal('deterministic-demo'),
});

export const IncidentListQuerySchema = z.object({
  type: IncidentTypeSchema.optional(),
});

export const IncidentListResponseSchema = z.object({
  incidents: z.array(IncidentSchema),
});

export type IncidentType = z.infer<typeof IncidentTypeSchema>;
export type IncidentPriority = z.infer<typeof IncidentPrioritySchema>;
export type CreateIncidentRequest = z.infer<typeof CreateIncidentRequestSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type CreateIncidentResponse = z.infer<typeof CreateIncidentResponseSchema>;
export type IncidentListQuery = z.infer<typeof IncidentListQuerySchema>;
export type IncidentListResponse = z.infer<typeof IncidentListResponseSchema>;
