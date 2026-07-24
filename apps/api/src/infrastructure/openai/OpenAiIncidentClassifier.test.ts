import { describe, expect, it } from 'vitest';
import { OpenAiIncidentClassifier } from './OpenAiIncidentClassifier.js';
import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';

describe('OpenAiIncidentClassifier', () => {
  it('clasifica incidencias con salida validada y modo OpenAI', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const classifier = new OpenAiIncidentClassifier({
      nowMs: sequenceNow(1_000, 1_120),
      responses: {
        createStructuredResponse: async () => ({
          output: {
            type: 'ascensor',
            priority: 'alta',
            suggestedResponsible: 'Mantenimiento de ascensores',
          },
          usage: { inputTokens: 800, cachedInputTokens: 200, outputTokens: 120 },
        }),
      },
      telemetry,
    });

    await expect(
      classifier.classify('El ascensor del portal B no funciona desde esta mañana.'),
    ).resolves.toEqual({
      classification: {
        type: 'ascensor',
        priority: 'alta',
        suggestedResponsible: 'Mantenimiento de ascensores',
      },
      mode: 'openai',
    });
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'incident-classification',
        promptVersion: 'incident-classification.v1',
        cachedInputTokens: 200,
        latencyMs: 120,
        result: 'success',
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
