import OpenAI from 'openai';
import type { EmbeddingProvider } from '../../application/ports/EmbeddingProvider.js';
import type {
  AiTelemetryReporter,
  AiTelemetryResult,
} from '../../application/ports/AiTelemetryReporter.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';

export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
export const OPENAI_EMBEDDING_DIMENSIONS = 1_536;
export const OPENAI_EMBEDDING_PROMPT_VERSION = 'document-embedding.v1';

const OPENAI_EMBEDDING_INPUT_USD_PER_MILLION = 0.02;
const TOKENS_PER_MILLION = 1_000_000;

interface OpenAiEmbeddingRequest {
  readonly dimensions: number;
  readonly encoding_format: 'float';
  readonly input: readonly string[];
  readonly model: string;
}

interface OpenAiEmbeddingResponse {
  readonly data: readonly {
    readonly embedding: readonly number[];
    readonly index: number;
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly total_tokens?: number;
  } | null;
}

export interface OpenAiEmbeddingsClient {
  createEmbeddings(request: OpenAiEmbeddingRequest): Promise<OpenAiEmbeddingResponse>;
}

interface OpenAiEmbeddingProviderDependencies {
  readonly client: OpenAiEmbeddingsClient;
  readonly nowMs?: () => number;
  readonly telemetry: AiTelemetryReporter;
}

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = OPENAI_EMBEDDING_DIMENSIONS;
  readonly model = OPENAI_EMBEDDING_MODEL;

  constructor(private readonly dependencies: OpenAiEmbeddingProviderDependencies) {}

  async embed(texts: readonly string[]): Promise<{
    readonly inputTokens: number;
    readonly vectors: readonly (readonly number[])[];
  }> {
    const nowMs = this.dependencies.nowMs ?? Date.now;
    const startedAt = nowMs();
    let inputTokens = 0;

    try {
      const response = await this.dependencies.client.createEmbeddings({
        dimensions: this.dimensions,
        encoding_format: 'float',
        input: texts,
        model: this.model,
      });
      inputTokens = response.usage?.prompt_tokens ?? response.usage?.total_tokens ?? 0;
      const vectors = orderAndValidateEmbeddings(response.data, texts.length, this.dimensions);

      await this.recordTelemetry({
        inputTokens,
        latencyMs: nowMs() - startedAt,
        result: 'success',
      });

      return { inputTokens, vectors };
    } catch (error) {
      await this.recordTelemetry({
        inputTokens,
        latencyMs: nowMs() - startedAt,
        result: 'failure',
      });
      throw error instanceof OpenAiProviderError
        ? error
        : new OpenAiProviderError('OpenAI no pudo generar embeddings documentales.', {
            cause: error,
          });
    }
  }

  private async recordTelemetry(event: {
    readonly inputTokens: number;
    readonly latencyMs: number;
    readonly result: AiTelemetryResult;
  }): Promise<void> {
    try {
      await this.dependencies.telemetry.record({
        cachedInputTokens: 0,
        estimatedCostUsd: estimateOpenAiEmbeddingCostUsd(event.inputTokens),
        inputTokens: event.inputTokens,
        latencyMs: event.latencyMs,
        model: this.model,
        operation: 'document-embedding',
        outputTokens: 0,
        promptVersion: OPENAI_EMBEDDING_PROMPT_VERSION,
        result: event.result,
      });
    } catch {
      // La telemetria es best-effort: nunca debe sustituir el resultado funcional.
    }
  }
}

export class OfficialOpenAiEmbeddingsClient implements OpenAiEmbeddingsClient {
  private readonly embeddings: {
    create(request: {
      dimensions: number;
      encoding_format: 'float';
      input: string[];
      model: string;
    }): Promise<OpenAiEmbeddingResponse>;
  };

  constructor(apiKey: string) {
    this.embeddings = new OpenAI({ apiKey }).embeddings;
  }

  async createEmbeddings(request: OpenAiEmbeddingRequest): Promise<OpenAiEmbeddingResponse> {
    return this.embeddings.create({
      dimensions: request.dimensions,
      encoding_format: request.encoding_format,
      input: [...request.input],
      model: request.model,
    });
  }
}

function orderAndValidateEmbeddings(
  data: readonly {
    readonly embedding: readonly number[];
    readonly index: number;
  }[],
  expectedCount: number,
  expectedDimensions: number,
): readonly (readonly number[])[] {
  if (data.length !== expectedCount) {
    throw new OpenAiProviderError('OpenAI devolvio una cantidad inesperada de embeddings.');
  }

  return [...data]
    .sort((left, right) => left.index - right.index)
    .map(({ embedding, index }, expectedIndex) => {
      if (index !== expectedIndex) {
        throw new OpenAiProviderError('OpenAI devolvio un indice de embedding inesperado.');
      }
      if (
        embedding.length !== expectedDimensions ||
        embedding.some((value) => !Number.isFinite(value))
      ) {
        throw new OpenAiProviderError('OpenAI devolvio un vector de embedding invalido.');
      }
      return embedding;
    });
}

function estimateOpenAiEmbeddingCostUsd(inputTokens: number): number {
  return (inputTokens * OPENAI_EMBEDDING_INPUT_USD_PER_MILLION) / TOKENS_PER_MILLION;
}
