import { PdfUploadConstraints, type UploadedDocument } from '@admin/contracts';
import { useEffect, useState } from 'react';
import { listUploadedDocuments, uploadPdfDocuments } from '../../../shared/api/uploadedDocuments';

export type UploadedDocumentsStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'uploading'
  | 'fallback'
  | 'error';

interface UploadedDocumentsState {
  readonly documents: UploadedDocument[];
  readonly error?: string;
  readonly status: UploadedDocumentsStatus;
}

export function useUploadedDocuments() {
  const [state, setState] = useState<UploadedDocumentsState>({
    documents: [],
    status: 'idle',
  });

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    return () => controller.abort();
  }, []);

  async function load(signal?: AbortSignal): Promise<void> {
    setState((current) => ({ ...current, error: undefined, status: 'loading' }));

    try {
      const documents = await listUploadedDocuments(signal);
      setState({ documents, status: 'ready' });
    } catch (error) {
      if (signal?.aborted) return;
      console.error('[useUploadedDocuments] No se pudieron cargar los PDFs de sesión.', error);
      setState({ documents: [], status: 'fallback' });
    }
  }

  async function upload(files: readonly File[]): Promise<void> {
    const validationError = validateFiles(files);
    if (validationError) {
      setState((current) => ({ ...current, error: validationError, status: 'error' }));
      return;
    }

    setState((current) => ({ ...current, error: undefined, status: 'uploading' }));

    try {
      const uploadedDocuments = await uploadPdfDocuments(files);
      setState((current) => ({
        documents: [...current.documents, ...uploadedDocuments],
        status: 'ready',
      }));
    } catch (error) {
      console.error('[useUploadedDocuments] No se pudieron subir los PDFs.', error);
      setState((current) => ({
        ...current,
        error: 'No se pudieron subir los PDFs. Inténtalo de nuevo.',
        status: 'error',
      }));
    }
  }

  return { ...state, upload };
}

function validateFiles(files: readonly File[]): string | undefined {
  if (files.length === 0) return undefined;
  if (
    files.some((file) => file.type !== PdfUploadConstraints.mimeType || !file.name.endsWith('.pdf'))
  ) {
    return 'Los adjuntos solo pueden ser PDF.';
  }
  if (files.some((file) => file.size > PdfUploadConstraints.maxSizeBytes)) {
    return 'Cada PDF debe pesar como máximo 5 MB.';
  }

  return undefined;
}
