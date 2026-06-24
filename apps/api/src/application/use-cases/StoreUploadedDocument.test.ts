import { PdfUploadConstraints } from '@admin/contracts';
import { describe, expect, it } from 'vitest';
import { InMemoryUploadedDocumentRepository } from '../../infrastructure/document/InMemoryUploadedDocumentRepository.js';
import {
  InvalidUploadedDocumentError,
  StoreUploadedDocument,
  UploadedDocumentTooLargeError,
} from './StoreUploadedDocument.js';

describe('StoreUploadedDocument', () => {
  it('guarda un PDF válido asociado a la sesión', async () => {
    const repository = new InMemoryUploadedDocumentRepository();
    const useCase = buildUseCase(repository);

    const document = await useCase.execute({
      sessionId: 'session-a',
      filename: 'Factura Ascensor.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      content: Buffer.from('%PDF-1.4 contenido pdf'),
    });

    expect(document).toMatchObject({
      id: 'pdf-0001',
      title: 'Factura Ascensor',
      documentUrl: '/api/documents/uploads/pdf-0001/Factura%20Ascensor.pdf',
    });
    await expect(repository.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({ textContent: 'Contrato de mantenimiento del ascensor.' }),
    ]);
  });

  it('rechaza archivos que no son PDF', async () => {
    const useCase = buildUseCase();

    await expect(
      useCase.execute({
        sessionId: 'session-a',
        filename: 'notas.txt',
        contentType: 'text/plain',
        sizeBytes: 100,
        content: Buffer.from('texto'),
      }),
    ).rejects.toBeInstanceOf(InvalidUploadedDocumentError);
  });

  it('rechaza archivos con metadatos de PDF pero contenido no PDF', async () => {
    const useCase = buildUseCase();

    await expect(
      useCase.execute({
        sessionId: 'session-a',
        filename: 'contrato.pdf',
        contentType: 'application/pdf',
        sizeBytes: 100,
        content: Buffer.from('texto plano'),
      }),
    ).rejects.toBeInstanceOf(InvalidUploadedDocumentError);
  });

  it('acepta PDFs con tamaño exactamente igual al límite permitido', async () => {
    const useCase = buildUseCase();

    const document = await useCase.execute({
      sessionId: 'session-a',
      filename: 'limite.pdf',
      contentType: 'application/pdf',
      sizeBytes: PdfUploadConstraints.maxSizeBytes,
      content: Buffer.from('%PDF-1.4 contenido pdf'),
    });

    expect(document.sizeBytes).toBe(PdfUploadConstraints.maxSizeBytes);
  });

  it('rechaza PDFs de más de 5 MB', async () => {
    const useCase = buildUseCase();

    await expect(
      useCase.execute({
        sessionId: 'session-a',
        filename: 'grande.pdf',
        contentType: 'application/pdf',
        sizeBytes: 5 * 1024 * 1024 + 1,
        content: Buffer.from('%PDF-1.4 contenido pdf'),
      }),
    ).rejects.toBeInstanceOf(UploadedDocumentTooLargeError);
  });
});

function buildUseCase(
  repository = new InMemoryUploadedDocumentRepository(),
): StoreUploadedDocument {
  return new StoreUploadedDocument({
    clock: { now: () => new Date('2026-06-24T08:00:00.000Z') },
    ids: { randomId: () => 'pdf-0001' },
    repository,
    textExtractor: { extractText: async () => 'Contrato de mantenimiento del ascensor.' },
  });
}
