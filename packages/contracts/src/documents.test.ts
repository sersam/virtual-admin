import { describe, expect, it } from 'vitest';
import {
  DocumentQueryRequestSchema,
  DocumentQueryResponseSchema,
  PdfUploadConstraints,
  UploadedDocumentResponseSchema,
  UploadedDocumentsResponseSchema,
} from './documents.js';

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

  it('valida límites de longitud de las preguntas', () => {
    const boundaryQuestion = 'a'.repeat(300);

    expect(DocumentQueryRequestSchema.parse({ question: boundaryQuestion })).toEqual({
      question: boundaryQuestion,
    });
    expect(() => DocumentQueryRequestSchema.parse({ question: 'a'.repeat(301) })).toThrow();
  });

  it('rechaza enums y enlaces de fuente inválidos', () => {
    const validResponse = {
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
          score: 0.5,
        },
      ],
    };

    expect(() =>
      DocumentQueryResponseSchema.parse({ ...validResponse, mode: 'demo-desconocido' }),
    ).toThrow();
    expect(() =>
      DocumentQueryResponseSchema.parse({
        ...validResponse,
        sources: [{ ...validResponse.sources[0], type: 'factura' }],
      }),
    ).toThrow();
    expect(() =>
      DocumentQueryResponseSchema.parse({
        ...validResponse,
        sources: [{ ...validResponse.sources[0], documentUrl: '/documents/acta.txt' }],
      }),
    ).toThrow();
  });

  it('valida documentos PDF adjuntos a la sesión demo', () => {
    const document = {
      id: 'pdf-0001',
      title: 'Factura ascensor junio',
      type: 'adjunto',
      filename: 'factura-ascensor.pdf',
      sizeBytes: 1024,
      uploadedAt: '2026-06-24T08:00:00.000Z',
      documentUrl: '/api/documents/uploads/pdf-0001/factura-ascensor.pdf',
    };

    expect(UploadedDocumentResponseSchema.parse({ document })).toEqual({ document });
    expect(UploadedDocumentsResponseSchema.parse({ documents: [document] })).toEqual({
      documents: [document],
    });
  });

  it('rechaza documentos adjuntos con enlaces que no son PDF', () => {
    expect(() =>
      UploadedDocumentResponseSchema.parse({
        document: {
          id: 'pdf-0001',
          title: 'Factura ascensor junio',
          type: 'adjunto',
          filename: 'factura-ascensor.pdf',
          sizeBytes: 1024,
          uploadedAt: '2026-06-24T08:00:00.000Z',
          documentUrl: '/api/documents/uploads/pdf-0001/factura-ascensor.txt',
        },
      }),
    ).toThrow();
  });

  it('declara el límite de adjuntos PDF de sesión', () => {
    expect(PdfUploadConstraints).toEqual({
      maxSizeBytes: 5 * 1024 * 1024,
      mimeType: 'application/pdf',
    });
  });
});
