import { describe, expect, it } from 'vitest';
import { OpenAiIncidentClassifier } from './OpenAiIncidentClassifier.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';
import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';

const suggestedNotice = [
  'Estimados vecinos:',
  '',
  'Se ha registrado una avería en el ascensor del portal B.',
  '',
  'La administración comunicará cualquier novedad relevante.',
].join('\n');

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
            suggestedNotice,
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
        suggestedNotice,
      },
      mode: 'openai',
    });
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'incident-classification',
        promptVersion: 'incident-classification.v2',
        cachedInputTokens: 200,
        latencyMs: 120,
        result: 'success',
      }),
    ]);
  });

  it('mantiene la clasificación aunque falle la telemetría', async () => {
    const classifier = new OpenAiIncidentClassifier({
      nowMs: sequenceNow(1_000, 1_090),
      responses: {
        createStructuredResponse: async () => ({
          output: {
            type: 'ascensor',
            priority: 'alta',
            suggestedResponsible: 'Mantenimiento de ascensores',
            suggestedNotice,
          },
          usage: { inputTokens: 700, cachedInputTokens: 100, outputTokens: 80 },
        }),
      },
      telemetry: new RejectingTelemetryReporter(),
    });

    await expect(
      classifier.classify('El ascensor del portal B no funciona desde esta mañana.'),
    ).resolves.toEqual({
      classification: {
        type: 'ascensor',
        priority: 'alta',
        suggestedResponsible: 'Mantenimiento de ascensores',
        suggestedNotice,
      },
      mode: 'openai',
    });
  });

  it('mantiene el error funcional aunque falle la telemetría de fallo', async () => {
    const classifier = new OpenAiIncidentClassifier({
      nowMs: sequenceNow(1_000, 1_060),
      responses: {
        createStructuredResponse: async () => ({
          output: {
            type: 'desconocido',
            priority: 'alta',
            suggestedResponsible: 'Mantenimiento',
            suggestedNotice,
          },
          usage: { inputTokens: 700, cachedInputTokens: 100, outputTokens: 80 },
        }),
      },
      telemetry: new RejectingTelemetryReporter(),
    });

    await expect(
      classifier.classify('El ascensor del portal B no funciona desde esta mañana.'),
    ).rejects.toBeInstanceOf(OpenAiProviderError);
  });

  it('rechaza salidas sin comunicado sugerido valido', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const classifier = new OpenAiIncidentClassifier({
      nowMs: sequenceNow(1_000, 1_080),
      responses: {
        createStructuredResponse: async () => ({
          output: {
            type: 'ascensor',
            priority: 'alta',
            suggestedResponsible: 'Mantenimiento de ascensores',
            suggestedNotice: '',
          },
          usage: { inputTokens: 700, cachedInputTokens: 100, outputTokens: 80 },
        }),
      },
      telemetry,
    });

    await expect(
      classifier.classify('El ascensor del portal B no funciona desde esta mañana.'),
    ).rejects.toBeInstanceOf(OpenAiProviderError);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'incident-classification',
        promptVersion: 'incident-classification.v2',
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

class RejectingTelemetryReporter implements AiTelemetryReporter {
  async record(): Promise<void> {
    throw new Error('telemetry failure');
  }
}

function sequenceNow(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
