import { describe, expect, it } from 'vitest';
import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';
import {
  OPENAI_EMBEDDING_DIMENSIONS,
  OPENAI_EMBEDDING_MODEL,
  OpenAiEmbeddingProvider,
  type OpenAiEmbeddingsClient,
} from './OpenAiEmbeddingProvider.js';

describe('OpenAiEmbeddingProvider', () => {
  it('genera embeddings por lotes preservando orden, modelo y dimension', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const client = new RecordingEmbeddingsClient([
      { index: 1, embedding: vector(0.2) },
      { index: 0, embedding: vector(0.1) },
    ]);
    const provider = new OpenAiEmbeddingProvider({
      client,
      nowMs: sequenceNow(1_000, 1_140),
      telemetry,
    });

    await expect(provider.embed(['consulta', 'documento'])).resolves.toEqual({
      inputTokens: 42,
      vectors: [vector(0.1), vector(0.2)],
    });
    expect(provider.model).toBe(OPENAI_EMBEDDING_MODEL);
    expect(provider.dimensions).toBe(OPENAI_EMBEDDING_DIMENSIONS);
    expect(client.requests).toEqual([
      {
        dimensions: OPENAI_EMBEDDING_DIMENSIONS,
        encoding_format: 'float',
        input: ['consulta', 'documento'],
        model: OPENAI_EMBEDDING_MODEL,
      },
    ]);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        estimatedCostUsd: 0.00000084,
        inputTokens: 42,
        latencyMs: 140,
        model: OPENAI_EMBEDDING_MODEL,
        operation: 'document-embedding',
        outputTokens: 0,
        promptVersion: 'document-embedding.v1',
        result: 'success',
      }),
    ]);
  });

  it('rechaza respuestas con cantidad distinta de embeddings', async () => {
    const provider = new OpenAiEmbeddingProvider({
      client: new RecordingEmbeddingsClient([{ index: 0, embedding: vector(0.1) }]),
      telemetry: new RecordingTelemetryReporter(),
    });

    await expect(provider.embed(['uno', 'dos'])).rejects.toBeInstanceOf(OpenAiProviderError);
  });

  it('rechaza vectores con dimension incorrecta o valores no finitos', async () => {
    const invalidVector = [Number.NaN, ...Array.from({ length: 1535 }, () => 0)];
    const provider = new OpenAiEmbeddingProvider({
      client: new RecordingEmbeddingsClient([{ index: 0, embedding: invalidVector }]),
      telemetry: new RecordingTelemetryReporter(),
    });

    await expect(provider.embed(['texto'])).rejects.toBeInstanceOf(OpenAiProviderError);
  });

  it('mantiene el resultado funcional si falla la telemetria', async () => {
    const provider = new OpenAiEmbeddingProvider({
      client: new RecordingEmbeddingsClient([{ index: 0, embedding: vector(0.3) }]),
      telemetry: {
        record: async () => {
          throw new Error('telemetry failure');
        },
      },
    });

    await expect(provider.embed(['texto'])).resolves.toEqual({
      inputTokens: 42,
      vectors: [vector(0.3)],
    });
  });

  it('registra fallo y envuelve errores del proveedor', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const provider = new OpenAiEmbeddingProvider({
      client: {
        createEmbeddings: async () => {
          throw new Error('network');
        },
      },
      nowMs: sequenceNow(10, 25),
      telemetry,
    });

    await expect(provider.embed(['texto'])).rejects.toBeInstanceOf(OpenAiProviderError);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        latencyMs: 15,
        operation: 'document-embedding',
        result: 'failure',
      }),
    ]);
  });
});

class RecordingEmbeddingsClient implements OpenAiEmbeddingsClient {
  readonly requests: Parameters<OpenAiEmbeddingsClient['createEmbeddings']>[0][] = [];

  constructor(
    private readonly data: readonly {
      readonly embedding: readonly number[];
      readonly index: number;
    }[],
  ) {}

  async createEmbeddings(
    request: Parameters<OpenAiEmbeddingsClient['createEmbeddings']>[0],
  ): ReturnType<OpenAiEmbeddingsClient['createEmbeddings']> {
    this.requests.push(request);
    return {
      data: this.data,
      usage: { prompt_tokens: 42, total_tokens: 42 },
    };
  }
}

class RecordingTelemetryReporter implements AiTelemetryReporter {
  readonly events: AiTelemetryEvent[] = [];

  async record(event: AiTelemetryEvent): Promise<void> {
    this.events.push(event);
  }
}

function vector(value: number): readonly number[] {
  return Array.from({ length: OPENAI_EMBEDDING_DIMENSIONS }, () => value);
}

function sequenceNow(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
