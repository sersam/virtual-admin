import { describe, expect, it } from 'vitest';
import { OpenAiCommunityNoticeGenerator } from './OpenAiCommunityNoticeGenerator.js';
import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';

describe('OpenAiCommunityNoticeGenerator', () => {
  it('genera comunicados con GPT-5.6 Luna y registra telemetría', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const requests: unknown[] = [];
    const generator = new OpenAiCommunityNoticeGenerator({
      nowMs: sequenceNow(100, 175),
      responses: {
        createStructuredResponse: async (request) => {
          requests.push(request);

          return {
            output: {
              subject: 'Corte de agua',
              body: 'Estimados vecinos:\n\nEl suministro se interrumpirá mañana.',
            },
            usage: { inputTokens: 1_000, cachedInputTokens: 0, outputTokens: 300 },
          };
        },
      },
      telemetry,
    });

    await expect(generator.draft('Redacta un aviso de corte de agua.')).resolves.toEqual({
      draft: {
        subject: 'Corte de agua',
        body: 'Estimados vecinos:\n\nEl suministro se interrumpirá mañana.',
      },
      mode: 'openai',
    });
    expect(requests).toEqual([
      expect.objectContaining({
        model: 'gpt-5.6-luna',
        promptVersion: 'community-notice.v1',
        schemaName: 'community_notice_v1',
      }),
    ]);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'community-notice',
        model: 'gpt-5.6-luna',
        promptVersion: 'community-notice.v1',
        inputTokens: 1_000,
        outputTokens: 300,
        latencyMs: 75,
        result: 'success',
      }),
    ]);
  });

  it('rechaza salidas inválidas y registra fallo observable', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const generator = new OpenAiCommunityNoticeGenerator({
      nowMs: sequenceNow(200, 260),
      responses: {
        createStructuredResponse: async () => ({
          output: { subject: '', body: '' },
          usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 20 },
        }),
      },
      telemetry,
    });

    await expect(generator.draft('Redacta un aviso.')).rejects.toBeInstanceOf(OpenAiProviderError);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        inputTokens: 100,
        latencyMs: 60,
        outputTokens: 20,
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
