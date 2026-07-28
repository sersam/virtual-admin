import { describe, expect, it } from 'vitest';
import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';
import { OpenAiDocumentAnswerGenerator } from './OpenAiDocumentAnswerGenerator.js';

const evidence = [
  {
    id: 'normas-piscina',
    title: 'Normas de piscina',
    section: 'Horarios',
    content: 'La piscina abre de 10:00 a 21:00 durante la temporada de verano.',
  },
  {
    id: 'acta-junio',
    title: 'Acta de junio',
    section: 'Ruegos',
    content: 'Se revisará la señalización de la piscina antes de julio.',
  },
];

describe('OpenAiDocumentAnswerGenerator', () => {
  it('genera respuestas documentales estructuradas con telemetría', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const requests: unknown[] = [];
    const generator = new OpenAiDocumentAnswerGenerator({
      nowMs: sequenceNow(2_000, 2_140),
      responses: {
        createStructuredResponse: async (request) => {
          requests.push(request);
          return {
            output: {
              answer: 'La piscina abre de 10:00 a 21:00 durante la temporada de verano.',
              sourceIds: ['normas-piscina'],
            },
            usage: { inputTokens: 900, cachedInputTokens: 120, outputTokens: 110 },
          };
        },
      },
      telemetry,
    });

    await expect(
      generator.generate({
        question: '¿Cuál es el horario de piscina?',
        evidence,
      }),
    ).resolves.toEqual({
      answer: 'La piscina abre de 10:00 a 21:00 durante la temporada de verano.',
      sourceIds: ['normas-piscina'],
      mode: 'openai',
    });

    expect(requests).toEqual([
      expect.objectContaining({
        model: 'gpt-5-nano',
        promptVersion: 'document-answer.v1',
        schemaName: 'document_answer_v1',
      }),
    ]);
    expect(requests[0]).toEqual(
      expect.objectContaining({
        instructions: expect.stringContaining('No inventes fuentes'),
        input: JSON.stringify({
          question: '¿Cuál es el horario de piscina?',
          sources: evidence,
        }),
      }),
    );
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'document-answer',
        promptVersion: 'document-answer.v1',
        cachedInputTokens: 120,
        inputTokens: 900,
        outputTokens: 110,
        latencyMs: 140,
        result: 'success',
      }),
    ]);
  });

  it('rechaza IDs no recuperados y registra fallo observable', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const generator = new OpenAiDocumentAnswerGenerator({
      nowMs: sequenceNow(3_000, 3_090),
      responses: {
        createStructuredResponse: async () => ({
          output: {
            answer: 'Respuesta con una fuente externa.',
            sourceIds: ['web-ajena'],
          },
          usage: { inputTokens: 500, cachedInputTokens: 0, outputTokens: 80 },
        }),
      },
      telemetry,
    });

    await expect(
      generator.generate({
        question: '¿Cuál es el horario de piscina?',
        evidence,
      }),
    ).rejects.toBeInstanceOf(OpenAiProviderError);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'document-answer',
        promptVersion: 'document-answer.v1',
        result: 'failure',
      }),
    ]);
  });

  it('rechaza IDs duplicados y registra fallo observable', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const generator = new OpenAiDocumentAnswerGenerator({
      nowMs: sequenceNow(4_000, 4_070),
      responses: {
        createStructuredResponse: async () => ({
          output: {
            answer: 'Respuesta con fuente duplicada.',
            sourceIds: ['normas-piscina', 'normas-piscina'],
          },
          usage: { inputTokens: 500, cachedInputTokens: 0, outputTokens: 80 },
        }),
      },
      telemetry,
    });

    await expect(
      generator.generate({
        question: '¿Cuál es el horario de piscina?',
        evidence,
      }),
    ).rejects.toBeInstanceOf(OpenAiProviderError);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'document-answer',
        promptVersion: 'document-answer.v1',
        result: 'failure',
      }),
    ]);
  });

  it('rechaza más de tres fuentes y registra fallo observable', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const generator = new OpenAiDocumentAnswerGenerator({
      nowMs: sequenceNow(5_000, 5_060),
      responses: {
        createStructuredResponse: async () => ({
          output: {
            answer: 'Respuesta con demasiadas fuentes.',
            sourceIds: ['normas-piscina', 'acta-junio', 'contrato-jardines', 'normas-ruido'],
          },
          usage: { inputTokens: 500, cachedInputTokens: 0, outputTokens: 80 },
        }),
      },
      telemetry,
    });

    await expect(
      generator.generate({
        question: '¿Cuál es el horario de piscina?',
        evidence: [
          ...evidence,
          {
            id: 'contrato-jardines',
            title: 'Contrato de jardines',
            section: 'Mantenimiento',
            content: 'El contrato incluye poda mensual.',
          },
          {
            id: 'normas-ruido',
            title: 'Normas de ruido',
            section: 'Descanso',
            content: 'Las actividades ruidosas terminan a las 22:00.',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(OpenAiProviderError);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'document-answer',
        promptVersion: 'document-answer.v1',
        result: 'failure',
      }),
    ]);
  });
});

class RecordingTelemetryReporter implements AiTelemetryReporter {
  readonly events: AiTelemetryEvent[] = [];

  async record(event: AiTelemetryEvent): Promise<void> {
    this.events.push(event);
  }
}

function sequenceNow(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
