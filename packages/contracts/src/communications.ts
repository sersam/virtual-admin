import { z } from 'zod';

export const CommunityNoticeDraftRequestSchema = z.object({
  message: z.string().trim().min(3).max(500),
});

export const CommunityNoticeDraftSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2_000),
});

export const CommunityNoticeDraftResponseSchema = z.object({
  draft: CommunityNoticeDraftSchema,
  mode: z.literal('deterministic-demo'),
});

export type CommunityNoticeDraftRequest = z.infer<typeof CommunityNoticeDraftRequestSchema>;
export type CommunityNoticeDraft = z.infer<typeof CommunityNoticeDraftSchema>;
export type CommunityNoticeDraftResponse = z.infer<typeof CommunityNoticeDraftResponseSchema>;
