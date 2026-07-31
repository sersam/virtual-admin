import { z } from 'zod';
import { AiFallbackReasonSchema } from './ai.js';
import { AiProviderModeSchema } from './communications.js';

export const MeetingMinutesDraftRequestSchema = z.object({
  notes: z.string().trim().min(10).max(4_000),
});

export const MeetingMinutesTaskSchema = z.object({
  description: z.string().trim().min(1).max(240),
  assignee: z.string().trim().min(1).max(120).optional(),
  dueDate: z.string().trim().min(1).max(80).optional(),
});

export const MeetingMinutesDraftSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4_000),
  agreements: z.array(z.string().trim().min(1).max(240)).max(50),
  tasks: z.array(MeetingMinutesTaskSchema).max(50),
});

export const MeetingMinutesDraftResponseSchema = z.object({
  draft: MeetingMinutesDraftSchema,
  fallbackReason: AiFallbackReasonSchema.optional(),
  mode: AiProviderModeSchema,
});

export type MeetingMinutesDraftRequest = z.infer<typeof MeetingMinutesDraftRequestSchema>;
export type MeetingMinutesTask = z.infer<typeof MeetingMinutesTaskSchema>;
export type MeetingMinutesDraft = z.infer<typeof MeetingMinutesDraftSchema>;
export type MeetingMinutesDraftResponse = z.infer<typeof MeetingMinutesDraftResponseSchema>;
