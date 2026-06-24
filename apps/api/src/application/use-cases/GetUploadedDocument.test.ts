import { describe, expect, it } from 'vitest';
import { InMemoryUploadedDocumentRepository } from '../../infrastructure/document/InMemoryUploadedDocumentRepository.js';
import { StoreUploadedDocument } from './StoreUploadedDocument.js';
import { GetUploadedDocument, UploadedDocumentNotFoundError } from './GetUploadedDocument.js';

describe('GetUploadedDocument', () => {
  it('recupera un PDF subido dentro de la sesión', async () => {
    const repository = new InMemoryUploadedDocumentRepository();
    const store = new StoreUploadedDocument({
      clock: { now: () => new Date('2026-06-23T10:00:00.000Z') },
      ids: { randomId: () => 'pdf-0001' },
      repository,
      textExtractor: { extractText: async () => 'Contenido del acta.' },
    });
    await store.execute({
      sessionId: 'session-1',
      filename: 'Acta Junio.pdf',
      contentType: 'application/pdf',
      sizeBytes: 16,
      content: Buffer.from('%PDF-1.4 acta'),
    });
    const useCase = new GetUploadedDocument({ repository });

    await expect(
      useCase.execute({ sessionId: 'session-1', documentId: 'pdf-0001' }),
    ).resolves.toMatchObject({
      id: 'pdf-0001',
      filename: 'Acta Junio.pdf',
      contentType: 'application/pdf',
      content: Buffer.from('%PDF-1.4 acta'),
    });
  });

  it('rechaza documentos de otra sesión', async () => {
    const repository = new InMemoryUploadedDocumentRepository();
    const store = new StoreUploadedDocument({
      clock: { now: () => new Date('2026-06-23T10:00:00.000Z') },
      ids: { randomId: () => 'pdf-0001' },
      repository,
      textExtractor: { extractText: async () => 'Contenido del acta.' },
    });
    await store.execute({
      sessionId: 'session-1',
      filename: 'Acta Junio.pdf',
      contentType: 'application/pdf',
      sizeBytes: 16,
      content: Buffer.from('%PDF-1.4 acta'),
    });
    const useCase = new GetUploadedDocument({ repository });

    await expect(
      useCase.execute({ sessionId: 'session-2', documentId: 'pdf-0001' }),
    ).rejects.toBeInstanceOf(UploadedDocumentNotFoundError);
  });
});
