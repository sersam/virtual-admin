import { describe, expect, it } from 'vitest';
import type { RetrievedDocument } from '../../domain/document/CommunityDocument.js';
import { AnswerDocumentQuestion } from './AnswerDocumentQuestion.js';

const poolDocument: RetrievedDocument = {
  id: 'normas-piscina',
  title: 'Normas de uso de zonas comunes',
  type: 'normas',
  section: 'Piscina',
  content: 'La piscina comunitaria abre de 10:00 a 21:00 durante la temporada de verano.',
  documentUrl: '/documents/normas-zonas-comunes.pdf',
  score: 0.9,
};

const uploadedDocument: RetrievedDocument = {
  id: 'pdf-0001',
  title: 'Contrato ascensor',
  type: 'adjunto',
  section: 'Documento adjunto',
  content: 'El contrato de mantenimiento del ascensor del portal B vence el 30 de septiembre.',
  documentUrl: '/api/documents/uploads/pdf-0001/contrato-ascensor.pdf',
  score: 1,
};

describe('AnswerDocumentQuestion', () => {
  it('responde siempre con fuentes recuperadas reales', async () => {
    const useCase = new AnswerDocumentQuestion({
      retriever: { retrieve: async () => [poolDocument] },
    });

    const response = await useCase.execute('¿Cuál es el horario de piscina?');

    expect(response.mode).toBe('lexical-demo');
    expect(response.answer).toContain('piscina comunitaria');
    expect(response.sources).toEqual([
      expect.objectContaining({ id: 'normas-piscina', section: 'Piscina' }),
    ]);
  });

  it('incluye PDFs subidos de la sesión cuando aportan evidencia', async () => {
    const useCase = new AnswerDocumentQuestion({
      retriever: { retrieve: async () => [] },
      sessionRetriever: {
        retrieveForSession: async (sessionId) =>
          sessionId === 'session-1' ? [uploadedDocument] : [],
      },
    });

    const response = await useCase.execute('¿Cuándo vence el contrato del ascensor?', {
      sessionId: 'session-1',
    });

    expect(response.answer).toContain('contrato de mantenimiento');
    expect(response.sources).toEqual([
      expect.objectContaining({
        id: 'pdf-0001',
        type: 'adjunto',
        section: 'Documento adjunto',
      }),
    ]);
  });

  it('declara falta de evidencia cuando no recupera fuentes', async () => {
    const useCase = new AnswerDocumentQuestion({
      retriever: { retrieve: async () => [] },
      sessionRetriever: {
        retrieveForSession: async () => [uploadedDocument],
      },
    });

    const response = await useCase.execute('¿Hay servicio de conserjería nocturna?');

    expect(response.sources).toEqual([]);
    expect(response.answer).toContain('No he encontrado fuentes suficientes');
  });

  it('propaga errores del recuperador documental', async () => {
    const retrieverError = new Error('vector index unavailable');
    const useCase = new AnswerDocumentQuestion({
      retriever: {
        retrieve: async () => {
          throw retrieverError;
        },
      },
    });

    await expect(useCase.execute('¿Cuál es el horario de piscina?')).rejects.toThrow(
      retrieverError,
    );
  });
});
