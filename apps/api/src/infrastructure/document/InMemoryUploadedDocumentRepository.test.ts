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
      documentUrl: '/api/documents/uploads/pdf-0001/ascensor.pdf',
      content: Buffer.from('pdf'),
      textContent: 'Contenido del PDF del ascensor.',
    });

    await expect(repository.listBySession('session-a')).resolves.toHaveLength(1);
    await expect(repository.listBySession('session-b')).resolves.toEqual([]);
  });

  it('conserva la primera version cuando se repite la identidad en una sesion', async () => {
    const repository = new InMemoryUploadedDocumentRepository();
    await repository.save(uploadedDocument({ title: 'Acta original' }));
    await repository.save(uploadedDocument({ title: 'Acta modificada' }));
    await repository.save(
      uploadedDocument({ sessionId: 'session-b', title: 'Acta de otra sesión' }),
    );

    await expect(repository.listBySession('session-a')).resolves.toEqual([
      uploadedDocument({ title: 'Acta original' }),
    ]);
    await expect(repository.listBySession('session-b')).resolves.toEqual([
      uploadedDocument({ sessionId: 'session-b', title: 'Acta de otra sesión' }),
    ]);
  });
});

function uploadedDocument(overrides: { readonly sessionId?: string; readonly title: string }) {
  return {
    id: 'pdf-0001',
    sessionId: overrides.sessionId ?? 'session-a',
    filename: 'ascensor.pdf',
    title: overrides.title,
    contentType: 'application/pdf' as const,
    sizeBytes: 1024,
    uploadedAt: new Date('2026-06-24T08:00:00.000Z'),
    documentUrl: '/api/documents/uploads/pdf-0001/ascensor.pdf',
    content: Buffer.from('pdf'),
    textContent: 'Contenido del PDF del ascensor.',
  };
}
