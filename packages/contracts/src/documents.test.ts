import { describe, expect, it } from 'vitest';
import { DocumentQueryRequestSchema, DocumentQueryResponseSchema } from './documents.js';

describe('document contracts', () => {
  it('valida consultas y respuestas RAG con fuentes', () => {
    expect(
      DocumentQueryRequestSchema.parse({ question: '¿Cuál es el horario de piscina?' }),
    ).toEqual({
      question: '¿Cuál es el horario de piscina?',
    });

    expect(
      DocumentQueryResponseSchema.parse({
        answer: 'La piscina abre de 10:00 a 21:00.',
        mode: 'lexical-demo',
        sources: [
          {
            id: 'normas-piscina',
            title: 'Normas de uso de piscina',
            type: 'normas',
            section: 'Piscina',
            excerpt: 'La piscina comunitaria abre de 10:00 a 21:00 durante la temporada.',
            documentUrl: '/documents/normas-zonas-comunes.pdf',
            score: 0.94,
          },
        ],
      }),
    ).toMatchObject({ sources: [{ id: 'normas-piscina' }] });
  });

  it('rechaza preguntas vacías y puntuaciones fuera de rango', () => {
    expect(() => DocumentQueryRequestSchema.parse({ question: '  ' })).toThrow();
    expect(() =>
      DocumentQueryResponseSchema.parse({
        answer: 'Respuesta',
        mode: 'lexical-demo',
        sources: [
          {
            id: 'fuente',
            title: 'Documento',
            type: 'acta',
            section: 'Sección',
            excerpt: 'Fragmento',
            documentUrl: '/documents/acta-marzo-2026.pdf',
            score: 2,
          },
        ],
      }),
    ).toThrow();
  });
});
