import { describe, expect, it } from 'vitest';
import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';
import { OpenAiMeetingMinutesGenerator } from './OpenAiMeetingMinutesGenerator.js';

describe('OpenAiMeetingMinutesGenerator', () => {
  it('genera actas estructuradas con GPT-5 nano y telemetria', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const requests: unknown[] = [];
    const generator = new OpenAiMeetingMinutesGenerator({
      nowMs: sequenceNow(1_000, 1_180),
      responses: {
        createStructuredResponse: async (request) => {
          requests.push(request);

          return {
            output: {
              body: 'Acta de reunión\n\nSe acuerda aprobar el presupuesto.',
              agreements: ['aprobar el presupuesto'],
              tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
            },
            usage: { inputTokens: 1_100, cachedInputTokens: 100, outputTokens: 260 },
          };
        },
      },
      telemetry,
    });

    await expect(
      generator.draft('Acuerdo: aprobar presupuesto.\nTarea: Revisar contrato; Responsable: Ana'),
    ).resolves.toEqual({
      draft: {
        title: 'Acta de reunión',
        body: 'Acta de reunión\n\nSe acuerda aprobar el presupuesto.',
        agreements: ['aprobar el presupuesto'],
        tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
      },
      mode: 'openai',
    });

    expect(requests).toEqual([
      expect.objectContaining({
        input: JSON.stringify({
          notes: 'Acuerdo: aprobar presupuesto.\nTarea: Revisar contrato; Responsable: Ana',
        }),
        instructions: expect.stringContaining('No inventes asistentes'),
        maxOutputTokens: 1_500,
        model: 'gpt-5-nano',
        promptVersion: 'meeting-minutes.v1',
        schemaName: 'meeting_minutes_draft_v1',
      }),
    ]);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        cachedInputTokens: 100,
        inputTokens: 1_100,
        latencyMs: 180,
        operation: 'meeting-minutes',
        outputTokens: 260,
        promptVersion: 'meeting-minutes.v1',
        result: 'success',
      }),
    ]);
  });

  it('rechaza salidas invalidas y registra fallo observable', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const generator = new OpenAiMeetingMinutesGenerator({
      nowMs: sequenceNow(2_000, 2_060),
      responses: {
        createStructuredResponse: async () => ({
          output: {
            body: '',
            agreements: ['aprobar presupuesto'],
            tasks: [],
          },
          usage: { inputTokens: 700, cachedInputTokens: 0, outputTokens: 40 },
        }),
      },
      telemetry,
    });

    await expect(generator.draft('Acuerdo: aprobar presupuesto.')).rejects.toBeInstanceOf(
      OpenAiProviderError,
    );
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'meeting-minutes',
        promptVersion: 'meeting-minutes.v1',
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
