import { describe, expect, it } from 'vitest';
import { InMemoryUploadedDocumentRepository } from '../../infrastructure/document/InMemoryUploadedDocumentRepository.js';
import { ListUploadedDocuments } from './ListUploadedDocuments.js';
import { StoreUploadedDocument } from './StoreUploadedDocument.js';

describe('ListUploadedDocuments', () => {
  it('lista únicamente PDFs de la sesión indicada', async () => {
    const repository = new InMemoryUploadedDocumentRepository();
    const store = new StoreUploadedDocument({
      clock: { now: () => new Date('2026-06-24T08:00:00.000Z') },
      ids: { randomId: () => 'pdf-0001' },
      repository,
      textExtractor: { extractText: async () => 'Contenido del presupuesto.' },
    });
    await store.execute({
      sessionId: 'session-a',
      filename: 'presupuesto.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
      content: Buffer.from('pdf'),
    });

    const useCase = new ListUploadedDocuments({ repository });

    await expect(useCase.execute('session-a')).resolves.toEqual([
      expect.objectContaining({ id: 'pdf-0001', filename: 'presupuesto.pdf' }),
    ]);
    await expect(useCase.execute('session-b')).resolves.toEqual([]);
  });
});
