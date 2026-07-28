import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';
import { OpenAiChatIntentClassifier } from './OpenAiChatIntentClassifier.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';
import type { OpenAiResponsesClient, OpenAiUsage } from './OpenAiResponsesClient.js';

describe('OpenAiChatIntentClassifier', () => {
  it('clasifica la ruta del chat con salida estructurada y proveedor OpenAI', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const requests: RecordedStructuredRequest[] = [];
    const classifier = new OpenAiChatIntentClassifier({
      nowMs: sequenceNow(1_000, 1_075),
      responses: new RecordingResponsesClient(requests, { agent: 'documentos' }),
      telemetry,
    });

    await expect(classifier.classify('Consulta los estatutos de la comunidad.')).resolves.toEqual({
      agent: 'documentos',
      provider: 'openai',
    });
    expect(requests).toEqual([
      expect.objectContaining({
        input: 'Consulta los estatutos de la comunidad.',
        maxOutputTokens: 80,
        model: 'gpt-5-nano',
        promptVersion: 'chat-intent.v1',
        schemaName: 'chat_intent_v1',
      }),
    ]);
    expect(requests[0]?.instructions).toContain('documentos');
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'chat-intent-classification',
        promptVersion: 'chat-intent.v1',
        cachedInputTokens: 12,
        inputTokens: 100,
        outputTokens: 4,
        latencyMs: 75,
        result: 'success',
      }),
    ]);
  });

  it('rechaza agentes desconocidos como error de proveedor', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const classifier = new OpenAiChatIntentClassifier({
      nowMs: sequenceNow(1_000, 1_030),
      responses: new RecordingResponsesClient([], { agent: 'tesoreria' }),
      telemetry,
    });

    await expect(classifier.classify('Prepara un informe de tesorería.')).rejects.toBeInstanceOf(
      OpenAiProviderError,
    );
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'chat-intent-classification',
        promptVersion: 'chat-intent.v1',
        result: 'failure',
      }),
    ]);
  });
});

interface RecordedStructuredRequest {
  readonly input: string;
  readonly instructions: string;
  readonly maxOutputTokens: number;
  readonly model: string;
  readonly promptVersion: string;
  readonly schema: z.ZodType<unknown>;
  readonly schemaName: string;
}

class RecordingResponsesClient implements OpenAiResponsesClient {
  constructor(
    private readonly requests: RecordedStructuredRequest[],
    private readonly output: unknown,
  ) {}

  async createStructuredResponse<Output>(request: {
    readonly input: string;
    readonly instructions: string;
    readonly maxOutputTokens: number;
    readonly model: string;
    readonly promptVersion: string;
    readonly schema: z.ZodType<Output>;
    readonly schemaName: string;
  }): Promise<{ readonly output: unknown; readonly usage: OpenAiUsage }> {
    this.requests.push(request);

    return {
      output: this.output,
      usage: { cachedInputTokens: 12, inputTokens: 100, outputTokens: 4 },
    };
  }
}

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
