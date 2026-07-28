import { describe, expect, it } from 'vitest';
import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import type { UploadedCommunityDocument } from '../../domain/document/UploadedCommunityDocument.js';
import { residencialSierraNevadaDocuments } from './residencialSierraNevadaDocuments.js';
import { LexicalDocumentRetriever } from './LexicalDocumentRetriever.js';

describe('LexicalDocumentRetriever', () => {
  it('recupera normas de piscina para preguntas sobre horarios', async () => {
    const retriever = new LexicalDocumentRetriever(residencialSierraNevadaDocuments);

    const [first] = await retriever.retrieve('¿Cuál es el horario de la piscina?', 3);

    expect(first).toMatchObject({ id: 'normas-piscina' });
  });

  it('recupera actas relevantes para consultas de ascensor', async () => {
    const retriever = new LexicalDocumentRetriever(residencialSierraNevadaDocuments);

    const [first] = await retriever.retrieve('¿Qué se aprobó del ascensor del portal B?', 2);

    expect(first).toMatchObject({ id: 'acta-ascensor' });
  });

  it('no devuelve fuentes cuando la pregunta no coincide con el corpus', async () => {
    const retriever = new LexicalDocumentRetriever(residencialSierraNevadaDocuments);

    await expect(retriever.retrieve('¿Hay pista de pádel cubierta?', 3)).resolves.toEqual([]);
  });

  it('calcula el score con términos únicos de la pregunta', async () => {
    const retriever = new LexicalDocumentRetriever([
      {
        id: 'contrato-ascensor',
        title: 'Contrato ascensor',
        type: 'contrato',
        section: 'Ascensor',
        content: 'Mantenimiento del ascensor.',
        documentUrl: '/documents/contrato-ascensor.pdf',
      },
    ]);

    const [first] = await retriever.retrieve('ascensor ascensor garaje', 1);

    expect(first?.score).toBe(0.5);
  });

  it('incluye documentos subidos de la sesion cuando aportan mas evidencia', async () => {
    const retriever = new LexicalDocumentRetriever(
      residencialSierraNevadaDocuments,
      new FakeUploadedDocumentRepository([
        {
          content: Buffer.from('%PDF-1.4'),
          contentType: 'application/pdf',
          documentUrl: '/api/documents/uploads/pdf-0001/contrato-ascensor.pdf',
          filename: 'contrato-ascensor.pdf',
          id: 'pdf-0001',
          sessionId: 'session-1',
          sizeBytes: 8,
          textContent: 'El contrato del ascensor del portal B vence en septiembre.',
          title: 'Contrato ascensor',
          uploadedAt: new Date('2026-07-01T10:00:00.000Z'),
        },
      ]),
    );

    const results = await retriever.retrieve('contrato ascensor portal B', 3, {
      sessionId: 'session-1',
    });

    expect(results[0]).toMatchObject({
      id: 'pdf-0001',
      section: 'Documento adjunto',
      type: 'adjunto',
    });
  });
});

class FakeUploadedDocumentRepository implements UploadedDocumentRepository {
  constructor(private readonly documents: readonly UploadedCommunityDocument[]) {}

  async listBySession(sessionId: string): Promise<UploadedCommunityDocument[]> {
    return this.documents.filter((document) => document.sessionId === sessionId);
  }

  async save(): Promise<void> {
    throw new Error('Not implemented');
  }
}
