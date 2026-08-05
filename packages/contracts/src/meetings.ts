import { z } from 'zod';

export const MeetingKindSchema = z.enum(['ordinaria', 'extraordinaria']);

export const MeetingReviewPeriodSchema = z
  .object({
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .strict()
  .refine((period) => Date.parse(period.startsAt) <= Date.parse(period.endsAt), {
    message: 'El periodo de revision debe empezar antes o en el mismo instante en que termina.',
    path: ['startsAt'],
  });

export const MeetingSchema = z.object({
  id: z.string().trim().min(1).max(80),
  kind: MeetingKindSchema,
  title: z.string().trim().min(1).max(120),
  scheduledAt: z.iso.datetime(),
  reviewPeriod: MeetingReviewPeriodSchema,
});

export const MeetingListResponseSchema = z.object({
  meetings: z.array(MeetingSchema),
});

export type MeetingKind = z.infer<typeof MeetingKindSchema>;
export type MeetingReviewPeriod = z.infer<typeof MeetingReviewPeriodSchema>;
export type Meeting = z.infer<typeof MeetingSchema>;
export type MeetingListResponse = z.infer<typeof MeetingListResponseSchema>;
