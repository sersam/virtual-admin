import {
  DocumentQueryRequestSchema,
  DocumentQueryResponseSchema,
  type DocumentQueryResponse,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function queryDocuments(
  question: string,
  signal?: AbortSignal,
): Promise<DocumentQueryResponse> {
  const payload = DocumentQueryRequestSchema.parse({ question });
  const response = await fetch(`${apiBaseUrl}/api/documents/query`, {
    body: JSON.stringify(payload),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new Error(`No se pudo consultar la documentación (HTTP ${response.status}).`);
  }

  return DocumentQueryResponseSchema.parse(await response.json());
}
