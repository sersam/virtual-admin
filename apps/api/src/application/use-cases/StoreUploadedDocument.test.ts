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
    const useCase = new StoreUploadedDocument({
      clock: { now: () => new Date('2026-06-24T08:00:00.000Z') },
      ids: { randomId: () => 'pdf-0001' },
      repository,
      textExtractor: { extractText: async () => 'Contrato de mantenimiento del ascensor.' },
    });

    const document = await useCase.execute({
      sessionId: 'session-a',
      filename: 'Factura Ascensor.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      content: Buffer.from('contenido pdf'),
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
    const useCase = new StoreUploadedDocument({
      clock: { now: () => new Date('2026-06-24T08:00:00.000Z') },
      ids: { randomId: () => 'pdf-0001' },
      repository: new InMemoryUploadedDocumentRepository(),
      textExtractor: { extractText: async () => '' },
    });

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

  it('rechaza PDFs de más de 5 MB', async () => {
    const useCase = new StoreUploadedDocument({
      clock: { now: () => new Date('2026-06-24T08:00:00.000Z') },
      ids: { randomId: () => 'pdf-0001' },
      repository: new InMemoryUploadedDocumentRepository(),
      textExtractor: { extractText: async () => '' },
    });

    await expect(
      useCase.execute({
        sessionId: 'session-a',
        filename: 'grande.pdf',
        contentType: 'application/pdf',
        sizeBytes: 5 * 1024 * 1024 + 1,
        content: Buffer.alloc(1),
      }),
    ).rejects.toBeInstanceOf(UploadedDocumentTooLargeError);
  });
});
