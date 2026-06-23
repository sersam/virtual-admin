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

  it('declara falta de evidencia cuando no recupera fuentes', async () => {
    const useCase = new AnswerDocumentQuestion({
      retriever: { retrieve: async () => [] },
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
