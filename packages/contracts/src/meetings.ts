import { z } from 'zod';

export const MeetingKindSchema = z.enum(['ordinaria', 'extraordinaria']);

export const MeetingSchema = z.object({
  id: z.string().trim().min(1).max(80),
  kind: MeetingKindSchema,
  title: z.string().trim().min(1).max(120),
  scheduledAt: z.iso.datetime(),
});

export const MeetingListResponseSchema = z.object({
  meetings: z.array(MeetingSchema),
});

export type MeetingKind = z.infer<typeof MeetingKindSchema>;
export type Meeting = z.infer<typeof MeetingSchema>;
export type MeetingListResponse = z.infer<typeof MeetingListResponseSchema>;
