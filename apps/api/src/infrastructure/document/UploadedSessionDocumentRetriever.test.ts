import { describe, expect, it } from 'vitest';
import { InMemoryUploadedDocumentRepository } from './InMemoryUploadedDocumentRepository.js';
import { UploadedSessionDocumentRetriever } from './UploadedSessionDocumentRetriever.js';

describe('UploadedSessionDocumentRetriever', () => {
  it('recupera PDFs subidos de la sesión por coincidencia léxica', async () => {
    const repository = new InMemoryUploadedDocumentRepository();
    await repository.save({
      id: 'pdf-0001',
      sessionId: 'session-1',
      title: 'Contrato ascensor',
      filename: 'contrato-ascensor.pdf',
      contentType: 'application/pdf',
      sizeBytes: 128,
      uploadedAt: new Date('2026-06-24T08:00:00.000Z'),
      documentUrl: '/api/documents/uploads/pdf-0001/contrato-ascensor.pdf',
      content: Buffer.from('%PDF-1.4 contrato'),
      textContent: 'El contrato de mantenimiento del ascensor del portal B vence en septiembre.',
    });
    await repository.save({
      id: 'pdf-0002',
      sessionId: 'session-2',
      title: 'Contrato ajeno',
      filename: 'contrato-ajeno.pdf',
      contentType: 'application/pdf',
      sizeBytes: 128,
      uploadedAt: new Date('2026-06-24T08:00:00.000Z'),
      documentUrl: '/api/documents/uploads/pdf-0002/contrato-ajeno.pdf',
      content: Buffer.from('%PDF-1.4 contrato'),
      textContent: 'El contrato de mantenimiento del ascensor del portal C vence en octubre.',
    });
    const retriever = new UploadedSessionDocumentRetriever(repository);

    const documents = await retriever.retrieveForSession(
      'session-1',
      '¿Cuándo vence el contrato del ascensor?',
      3,
    );

    expect(documents).toEqual([
      expect.objectContaining({
        id: 'pdf-0001',
        type: 'adjunto',
        section: 'Documento adjunto',
        content: expect.stringContaining('portal B'),
      }),
    ]);
  });
});
