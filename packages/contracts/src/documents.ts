import { z } from 'zod';

export const DocumentQueryRequestSchema = z.object({
  question: z.string().trim().min(3).max(300),
});

export const DocumentSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['estatutos', 'normas', 'acta', 'contrato']),
  section: z.string().min(1),
  excerpt: z.string().min(1),
  documentUrl: z.string().min(1).endsWith('.pdf'),
  score: z.number().min(0).max(1),
});

export const DocumentAnswerModeSchema = z.enum(['lexical-demo', 'local-demo']);

export const DocumentQueryResponseSchema = z.object({
  answer: z.string().min(1),
  mode: DocumentAnswerModeSchema,
  sources: z.array(DocumentSourceSchema),
});

export type DocumentQueryRequest = z.infer<typeof DocumentQueryRequestSchema>;
export type DocumentSource = z.infer<typeof DocumentSourceSchema>;
export type DocumentQueryResponse = z.infer<typeof DocumentQueryResponseSchema>;
