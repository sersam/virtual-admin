import { z } from 'zod';
import { IncidentPrioritySchema } from './incidents.js';

export const MeetingAgendaDraftRequestSchema = z.object({}).strict();

export const MeetingAgendaItemSourceTypeSchema = z.enum(['incident', 'pending-agreement']);

export const MeetingAgendaItemSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  priority: IncidentPrioritySchema,
  sourceType: MeetingAgendaItemSourceTypeSchema,
  sourceId: z.string().trim().min(1).max(80),
  assignee: z.string().trim().min(1).max(120).optional(),
  dueDate: z.string().trim().min(1).max(80).optional(),
});

export const MeetingAgendaDraftSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4_000),
  items: z.array(MeetingAgendaItemSchema).max(100),
});

export const MeetingAgendaDraftResponseSchema = z.object({
  draft: MeetingAgendaDraftSchema,
  mode: z.literal('deterministic-demo'),
});

export type MeetingAgendaDraftRequest = z.infer<typeof MeetingAgendaDraftRequestSchema>;
export type MeetingAgendaItemSourceType = z.infer<typeof MeetingAgendaItemSourceTypeSchema>;
export type MeetingAgendaItem = z.infer<typeof MeetingAgendaItemSchema>;
export type MeetingAgendaDraft = z.infer<typeof MeetingAgendaDraftSchema>;
export type MeetingAgendaDraftResponse = z.infer<typeof MeetingAgendaDraftResponseSchema>;
