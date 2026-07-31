import { z } from 'zod';
import { AiFallbackReasonSchema } from './ai.js';
import { DocumentSourceSchema } from './documents.js';

export const ChatAgentSchema = z.enum([
  'documentos',
  'comunicados',
  'actas',
  'incidencias',
  'juntas',
  'general',
]);

export const ChatModeSchema = z.enum(['langgraph', 'local-demo']);
export const ChatProviderSchema = z.enum(['openai', 'deterministic-demo']);

export const ChatMessageRequestSchema = z.object({
  message: z.string().trim().min(3).max(500),
});

export const ChatMessageResponseSchema = z.object({
  agent: ChatAgentSchema,
  answer: z.string().min(1),
  fallbackReason: AiFallbackReasonSchema.optional(),
  mode: ChatModeSchema,
  provider: ChatProviderSchema,
  sources: z.array(DocumentSourceSchema),
});

export type ChatAgent = z.infer<typeof ChatAgentSchema>;
export type ChatMode = z.infer<typeof ChatModeSchema>;
export type ChatProvider = z.infer<typeof ChatProviderSchema>;
export type ChatMessageRequest = z.infer<typeof ChatMessageRequestSchema>;
export type ChatMessageResponse = z.infer<typeof ChatMessageResponseSchema>;
