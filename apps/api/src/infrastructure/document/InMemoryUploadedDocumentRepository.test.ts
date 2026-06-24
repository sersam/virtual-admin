import { describe, expect, it } from 'vitest';
import { InMemoryUploadedDocumentRepository } from './InMemoryUploadedDocumentRepository.js';

describe('InMemoryUploadedDocumentRepository', () => {
  it('mantiene aislados los PDFs por sesión', async () => {
    const repository = new InMemoryUploadedDocumentRepository();
    await repository.save({
      id: 'pdf-0001',
      sessionId: 'session-a',
      filename: 'ascensor.pdf',
      title: 'ascensor',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      uploadedAt: new Date('2026-06-24T08:00:00.000Z'),
      content: Buffer.from('pdf'),
    });

    await expect(repository.listBySession('session-a')).resolves.toHaveLength(1);
    await expect(repository.listBySession('session-b')).resolves.toEqual([]);
  });
});
