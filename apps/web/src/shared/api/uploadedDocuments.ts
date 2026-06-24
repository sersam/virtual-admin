import {
  UploadedDocumentResponseSchema,
  UploadedDocumentsResponseSchema,
  type UploadedDocument,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function listUploadedDocuments(signal?: AbortSignal): Promise<UploadedDocument[]> {
  const response = await fetch(`${apiBaseUrl}/api/documents/uploads`, {
    credentials: 'include',
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error(`No se pudieron listar los PDFs subidos (HTTP ${response.status}).`);
  }

  return UploadedDocumentsResponseSchema.parse(await response.json()).documents;
}

export async function uploadPdfDocuments(
  files: readonly File[],
  signal?: AbortSignal,
): Promise<UploadedDocument[]> {
  const uploadedDocuments: UploadedDocument[] = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append('document', file);

    const response = await fetch(`${apiBaseUrl}/api/documents/uploads`, {
      body: formData,
      credentials: 'include',
      method: 'POST',
      signal,
    });

    if (!response.ok) {
      throw new Error(`No se pudo subir el PDF "${file.name}" (HTTP ${response.status}).`);
    }

    uploadedDocuments.push(UploadedDocumentResponseSchema.parse(await response.json()).document);
  }

  return uploadedDocuments;
}
