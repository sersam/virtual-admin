import { z } from 'zod';
import { IncidentPrioritySchema } from './incidents.js';
import { MeetingSchema } from './meetings.js';

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

export const MeetingAgendaItemSchema = z.discriminatedUnion('sourceType', [
  MeetingAgendaBaseItemSchema.extend({
    priority: IncidentPrioritySchema,
    sourceType: z.literal('incident'),
  }).strict(),
  MeetingAgendaBaseItemSchema.extend({
    priority: IncidentPrioritySchema,
    sourceType: z.literal('pending-agreement'),
    assignee: z.string().trim().min(1).max(120).optional(),
    dueDate: z.string().trim().min(1).max(80).optional(),
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
  meeting: MeetingSchema,
  mode: z.literal('deterministic-demo'),
});

export type MeetingAgendaDraftRequest = z.infer<typeof MeetingAgendaDraftRequestSchema>;
export type MeetingAgendaItemSourceType = z.infer<typeof MeetingAgendaItemSourceTypeSchema>;
export type MeetingAgendaItem = z.infer<typeof MeetingAgendaItemSchema>;
export type MeetingAgendaDraft = z.infer<typeof MeetingAgendaDraftSchema>;
export type MeetingAgendaDraftResponse = z.infer<typeof MeetingAgendaDraftResponseSchema>;
