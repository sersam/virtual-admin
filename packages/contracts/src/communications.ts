import { z } from 'zod';

export const CommunityNoticeTypeSchema = z.enum(['informativo', 'recordatorio', 'urgente']);
export const CommunityNoticeAudienceSchema = z.enum(['todos', 'propietarios', 'residentes']);
export const CommunityNoticeToneSchema = z.enum(['formal', 'cercano', 'directo']);

export const CommunityNoticeDraftRequestSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  type: CommunityNoticeTypeSchema,
  audience: CommunityNoticeAudienceSchema,
  tone: CommunityNoticeToneSchema,
});

export const CommunityNoticeDraftSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2_000),
});

export const AiProviderModeSchema = z.enum(['deterministic-demo', 'openai']);

export const CommunityNoticeDraftResponseSchema = z.object({
  draft: CommunityNoticeDraftSchema,
  mode: AiProviderModeSchema,
});

export type CommunityNoticeDraftRequest = z.infer<typeof CommunityNoticeDraftRequestSchema>;
export type CommunityNoticeDraft = z.infer<typeof CommunityNoticeDraftSchema>;
export type CommunityNoticeType = z.infer<typeof CommunityNoticeTypeSchema>;
export type CommunityNoticeAudience = z.infer<typeof CommunityNoticeAudienceSchema>;
export type CommunityNoticeTone = z.infer<typeof CommunityNoticeToneSchema>;
export type AiProviderMode = z.infer<typeof AiProviderModeSchema>;
export type CommunityNoticeDraftResponse = z.infer<typeof CommunityNoticeDraftResponseSchema>;
