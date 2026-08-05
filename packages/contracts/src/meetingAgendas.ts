import { z } from 'zod';
import { AiFallbackReasonSchema } from './ai.js';
import { AiProviderModeSchema } from './communications.js';
import { IncidentPrioritySchema, IncidentStatusSchema } from './incidents.js';
import { MeetingReviewPeriodSchema, MeetingSchema } from './meetings.js';

export const MeetingAgendaDraftRequestSchema = z
  .object({
    meetingId: z.string().trim().min(1).max(80),
  })
  .strict();

export const MeetingAgendaItemSourceTypeSchema = z.enum([
  'incident',
  'pending-agreement',
  'proposal',
]);

const MeetingAgendaBaseItemSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  sourceId: z.string().trim().min(1).max(80),
});

const IncidentMeetingAgendaItemSchema = MeetingAgendaBaseItemSchema.extend({
  priority: IncidentPrioritySchema,
  sourceType: z.literal('incident'),
  status: IncidentStatusSchema,
  resolvedAt: z.iso.datetime().nullable(),
})
  .strict()
  .refine(
    (item) =>
      (item.status === 'pendiente' && item.resolvedAt === null) ||
      (item.status === 'resuelta' && item.resolvedAt !== null),
    {
      message: 'El estado de la incidencia debe ser coherente con su fecha de resolucion.',
      path: ['resolvedAt'],
    },
  );

export const MeetingAgendaItemSchema = z.union([
  IncidentMeetingAgendaItemSchema,
  MeetingAgendaBaseItemSchema.extend({
    priority: IncidentPrioritySchema,
    sourceType: z.literal('pending-agreement'),
    assignee: z.string().trim().min(1).max(120).optional(),
    dueDate: z.string().trim().min(1).max(80).optional(),
    dueOn: z.iso.date().optional(),
  }).strict(),
  MeetingAgendaBaseItemSchema.extend({
    sourceType: z.literal('proposal'),
  }).strict(),
]);

export const MeetingAgendaDraftSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4_000),
  items: z.array(MeetingAgendaItemSchema).max(100),
});

export const MeetingAgendaDraftResponseSchema = z.object({
  draft: MeetingAgendaDraftSchema,
  fallbackReason: AiFallbackReasonSchema.optional(),
  filterExplanations: z.array(z.string().trim().min(1).max(240)).min(1).max(10),
  meeting: MeetingSchema,
  mode: AiProviderModeSchema,
  reviewPeriod: MeetingReviewPeriodSchema,
});

export type MeetingAgendaDraftRequest = z.infer<typeof MeetingAgendaDraftRequestSchema>;
export type MeetingAgendaItemSourceType = z.infer<typeof MeetingAgendaItemSourceTypeSchema>;
export type MeetingAgendaItem = z.infer<typeof MeetingAgendaItemSchema>;
export type MeetingAgendaDraft = z.infer<typeof MeetingAgendaDraftSchema>;
export type MeetingAgendaDraftResponse = z.infer<typeof MeetingAgendaDraftResponseSchema>;
