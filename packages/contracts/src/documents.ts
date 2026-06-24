import { z } from 'zod';

export const DocumentQueryRequestSchema = z.object({
  question: z.string().trim().min(3).max(300),
});

export const PdfUploadConstraints = {
  maxSizeBytes: 5 * 1024 * 1024,
  mimeType: 'application/pdf',
} as const;

export const UploadedDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.literal('adjunto'),
  filename: z.string().min(1).endsWith('.pdf'),
  sizeBytes: z.number().int().positive().max(PdfUploadConstraints.maxSizeBytes),
  uploadedAt: z.iso.datetime(),
  documentUrl: z.string().min(1).endsWith('.pdf'),
});

export const DocumentSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['estatutos', 'normas', 'acta', 'contrato', 'adjunto']),
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

export const UploadedDocumentResponseSchema = z.object({
  document: UploadedDocumentSchema,
});

export const UploadedDocumentsResponseSchema = z.object({
  documents: z.array(UploadedDocumentSchema),
});

export type DocumentQueryRequest = z.infer<typeof DocumentQueryRequestSchema>;
export type UploadedDocument = z.infer<typeof UploadedDocumentSchema>;
export type DocumentSource = z.infer<typeof DocumentSourceSchema>;
export type DocumentQueryResponse = z.infer<typeof DocumentQueryResponseSchema>;
export type UploadedDocumentResponse = z.infer<typeof UploadedDocumentResponseSchema>;
export type UploadedDocumentsResponse = z.infer<typeof UploadedDocumentsResponseSchema>;
