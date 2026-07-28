import { describe, expect, it } from 'vitest';
import { AiProviderError } from '../ports/AiProviderError.js';
import type {
  DocumentAnswerGenerator,
  GenerateDocumentAnswerInput,
} from '../ports/DocumentAnswerGenerator.js';
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
  it('redacta con el generador documental usando evidencias recuperadas y acotadas', async () => {
    const generatedInputs: GenerateDocumentAnswerInput[] = [];
    const longDocument: RetrievedDocument = {
      ...poolDocument,
      id: 'normas-largas',
      content: `${'Contenido recuperado. '.repeat(100)} cierre`,
    };
    const useCase = new AnswerDocumentQuestion({
      retriever: { mode: 'lexical-demo', retrieve: async () => [poolDocument] },
      generator: {
        async generate(input) {
          generatedInputs.push(input);
          return {
            answer: 'La piscina abre de 10:00 a 21:00.',
            sourceIds: ['normas-piscina'],
            mode: 'deterministic-demo',
          };
        },
      },
    });

    const response = await useCase.execute('¿Cuál es el horario de piscina?');

    expect(response.mode).toBe('lexical-demo');
    expect(response.generationMode).toBe('deterministic-demo');
    expect(response.answer).toBe('La piscina abre de 10:00 a 21:00.');
    expect(response.sources).toEqual([
      expect.objectContaining({ id: 'normas-piscina', section: 'Piscina' }),
    ]);
    expect(generatedInputs).toEqual([
      {
        question: '¿Cuál es el horario de piscina?',
        evidence: [
          {
            id: 'normas-piscina',
            title: 'Normas de uso de zonas comunes',
            section: 'Piscina',
            content: 'La piscina comunitaria abre de 10:00 a 21:00 durante la temporada de verano.',
          },
        ],
      },
    ]);

    const boundedUseCase = new AnswerDocumentQuestion({
      retriever: { mode: 'lexical-demo', retrieve: async () => [longDocument] },
      generator: {
        async generate(input) {
          expect(input.evidence[0]?.content).toHaveLength(1200);
          return {
            answer: 'Respuesta desde evidencia acotada.',
            sourceIds: ['normas-largas'],
            mode: 'deterministic-demo',
          };
        },
      },
    });

    await boundedUseCase.execute('¿Qué dice el documento largo?');
  });

  it('incluye solo PDFs subidos de la sesión citados por el generador', async () => {
    const useCase = new AnswerDocumentQuestion({
      retriever: {
        mode: 'semantic-pgvector',
        retrieve: async (_question, _maxSources, context) =>
          context?.sessionId === 'session-1' ? [poolDocument, uploadedDocument] : [],
      },
      generator: {
        async generate() {
          return {
            answer: 'El contrato del ascensor vence el 30 de septiembre.',
            sourceIds: ['pdf-0001'],
            mode: 'deterministic-demo',
          };
        },
      },
    });

    const response = await useCase.execute('¿Cuándo vence el contrato del ascensor?', {
      sessionId: 'session-1',
    });

    expect(response.mode).toBe('semantic-pgvector');
    expect(response.generationMode).toBe('deterministic-demo');
    expect(response.answer).toContain('30 de septiembre');
    expect(response.sources).toEqual([
      expect.objectContaining({
        id: 'pdf-0001',
        type: 'adjunto',
        section: 'Documento adjunto',
      }),
    ]);
  });

  it('declara falta de evidencia cuando no recupera fuentes', async () => {
    let generatorCalls = 0;
    const useCase = new AnswerDocumentQuestion({
      retriever: { mode: 'lexical-demo', retrieve: async () => [] },
      generator: {
        async generate() {
          generatorCalls += 1;
          return {
            answer: 'No deberia invocarse.',
            sourceIds: [],
            mode: 'deterministic-demo',
          };
        },
      },
    });

    const response = await useCase.execute('¿Hay servicio de conserjería nocturna?');

    expect(response.sources).toEqual([]);
    expect(response.generationMode).toBe('deterministic-demo');
    expect(response.answer).toContain('No he encontrado fuentes suficientes');
    expect(generatorCalls).toBe(0);
  });

  it('propaga errores del recuperador documental', async () => {
    const retrieverError = new Error('vector index unavailable');
    const useCase = new AnswerDocumentQuestion({
      retriever: {
        mode: 'semantic-pgvector',
        retrieve: async () => {
          throw retrieverError;
        },
      },
      generator: createUnusedGenerator(),
    });

    await expect(useCase.execute('¿Cuál es el horario de piscina?')).rejects.toThrow(
      retrieverError,
    );
  });

  it('rechaza fuentes inventadas por el generador documental', async () => {
    const useCase = new AnswerDocumentQuestion({
      retriever: { mode: 'lexical-demo', retrieve: async () => [poolDocument] },
      generator: {
        async generate() {
          return {
            answer: 'Respuesta con una fuente inventada.',
            sourceIds: ['fuente-inventada'],
            mode: 'deterministic-demo',
          };
        },
      },
    });

    await expect(useCase.execute('¿Cuál es el horario de piscina?')).rejects.toBeInstanceOf(
      AiProviderError,
    );
  });

  it('rechaza fuentes duplicadas por el generador documental', async () => {
    const useCase = new AnswerDocumentQuestion({
      retriever: { mode: 'lexical-demo', retrieve: async () => [poolDocument] },
      generator: {
        async generate() {
          return {
            answer: 'Respuesta con una fuente duplicada.',
            sourceIds: ['normas-piscina', 'normas-piscina'],
            mode: 'deterministic-demo',
          };
        },
      },
    });

    await expect(useCase.execute('¿Cuál es el horario de piscina?')).rejects.toBeInstanceOf(
      AiProviderError,
    );
  });
});

function createUnusedGenerator(): DocumentAnswerGenerator {
  return {
    async generate() {
      throw new Error('No deberia invocarse el generador documental.');
    },
  };
}
