import {
  UploadedDocumentResponseSchema,
  UploadedDocumentsResponseSchema,
  type UploadedDocument,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export class PartialUploadError extends Error {
  constructor(
    message: string,
    readonly uploadedDocuments: UploadedDocument[],
    readonly failedFilenames: string[],
  ) {
    super(message);
    this.name = 'PartialUploadError';
  }
}

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
  const failedFilenames: string[] = [];

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
      failedFilenames.push(file.name);
      continue;
    }

    uploadedDocuments.push(UploadedDocumentResponseSchema.parse(await response.json()).document);
  }

  if (failedFilenames.length > 0) {
    throw new PartialUploadError(
      'No se pudieron subir todos los PDFs.',
      uploadedDocuments,
      failedFilenames,
    );
  }

  return uploadedDocuments;
}
