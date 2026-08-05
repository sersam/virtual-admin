import { describe, expect, it } from 'vitest';
import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';
import { OpenAiMeetingAgendaGenerator } from './OpenAiMeetingAgendaGenerator.js';

describe('OpenAiMeetingAgendaGenerator', () => {
  it('genera ordenes del dia estructuradas con GPT-5 nano y telemetria', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const requests: unknown[] = [];
    const generator = new OpenAiMeetingAgendaGenerator({
      nowMs: sequenceNow(1_000, 1_220),
      responses: {
        createStructuredResponse: async (request) => {
          requests.push(request);

          return {
            output: {
              body: '1. Revision de fuga de agua.\n2. Seguimiento del contrato de limpieza.',
            },
            usage: { inputTokens: 900, cachedInputTokens: 90, outputTokens: 180 },
          };
        },
      },
      telemetry,
    });

    await expect(
      generator.draft({
        meeting: {
          id: 'meeting-ordinary-2026-09-18',
          sessionId: 'session-a',
          kind: 'ordinaria',
          title: 'Junta ordinaria',
          scheduledAt: new Date('2026-09-18T17:00:00.000Z'),
          reviewPeriod: {
            startsAt: new Date('2026-04-30T08:30:00.000Z'),
            endsAt: new Date('2026-07-29T08:30:00.000Z'),
          },
        },
        items: [
          {
            description: 'Fuga de agua urgente en el garaje',
            priority: 'urgente',
            sourceType: 'incident',
            sourceId: 'inc-urgent',
            status: 'pendiente',
            resolvedAt: null,
          },
          {
            description: 'Revisar contrato de limpieza',
            priority: 'alta',
            sourceType: 'pending-agreement',
            sourceId: 'pending-a',
            assignee: 'Ana',
            dueDate: '30 de junio',
            dueOn: '2026-06-30',
          },
          {
            description: 'Fuga de agua ya reparada',
            priority: 'media',
            sourceType: 'incident',
            sourceId: 'inc-resolved',
            status: 'resuelta',
            resolvedAt: '2026-06-24T10:00:00.000Z',
          },
          {
            description: 'Instalar aparcabicis en el patio interior.',
            sourceType: 'proposal',
            sourceId: 'proposal-a',
          },
        ],
      }),
    ).resolves.toEqual({
      body: '1. Revision de fuga de agua.\n2. Seguimiento del contrato de limpieza.',
      mode: 'openai',
    });

    expect(JSON.parse((requests[0] as { input: string }).input)).toEqual({
      meeting: {
        id: 'meeting-ordinary-2026-09-18',
        kind: 'ordinaria',
        scheduledAt: '2026-09-18T17:00:00.000Z',
        title: 'Junta ordinaria',
        reviewPeriod: {
          startsAt: '2026-04-30T08:30:00.000Z',
          endsAt: '2026-07-29T08:30:00.000Z',
        },
      },
      items: [
        {
          description: 'Fuga de agua urgente en el garaje',
          priority: 'urgente',
          sourceType: 'incident',
          sourceId: 'inc-urgent',
          status: 'pendiente',
          resolvedAt: null,
        },
        {
          description: 'Revisar contrato de limpieza',
          priority: 'alta',
          sourceType: 'pending-agreement',
          sourceId: 'pending-a',
          assignee: 'Ana',
          dueDate: '30 de junio',
          dueOn: '2026-06-30',
        },
        {
          description: 'Fuga de agua ya reparada',
          priority: 'media',
          sourceType: 'incident',
          sourceId: 'inc-resolved',
          status: 'resuelta',
          resolvedAt: '2026-06-24T10:00:00.000Z',
        },
        {
          description: 'Instalar aparcabicis en el patio interior.',
          sourceType: 'proposal',
          sourceId: 'proposal-a',
        },
      ],
    });
    expect(requests).toEqual([
      expect.objectContaining({
        instructions: expect.stringContaining(
          'Las incidencias resueltas son contexto cerrado y no deben convertirse en asuntos pendientes',
        ),
        maxOutputTokens: 1_500,
        model: 'gpt-5-nano',
        promptVersion: 'meeting-agenda.v2',
        schemaName: 'meeting_agenda_draft_v2',
      }),
    ]);
    expect(JSON.parse((requests[0] as { input: string }).input)).not.toHaveProperty(
      'meeting.sessionId',
    );
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        cachedInputTokens: 90,
        inputTokens: 900,
        latencyMs: 220,
        operation: 'meeting-agenda',
        outputTokens: 180,
        promptVersion: 'meeting-agenda.v2',
        result: 'success',
      }),
    ]);
  });

  it('acepta cuerpos de 4.000 caracteres', async () => {
    const generator = new OpenAiMeetingAgendaGenerator({
      responses: {
        createStructuredResponse: async () => ({
          output: { body: 'a'.repeat(4_000) },
          usage: { inputTokens: 500, cachedInputTokens: 0, outputTokens: 900 },
        }),
      },
      telemetry: new RecordingTelemetryReporter(),
    });

    const response = await generator.draft(createAgendaInput());

    expect(response).toEqual({
      body: 'a'.repeat(4_000),
      mode: 'openai',
    });
  });

  it('rechaza cuerpos vacios o fuera de limite y registra fallo observable', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const generator = new OpenAiMeetingAgendaGenerator({
      nowMs: sequenceNow(2_000, 2_050),
      responses: {
        createStructuredResponse: async () => ({
          output: { body: '' },
          usage: { inputTokens: 500, cachedInputTokens: 0, outputTokens: 30 },
        }),
      },
      telemetry,
    });

    await expect(generator.draft(createAgendaInput())).rejects.toBeInstanceOf(OpenAiProviderError);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'meeting-agenda',
        promptVersion: 'meeting-agenda.v2',
        result: 'failure',
      }),
    ]);
  });

  it('rechaza cuerpos de 4.001 caracteres y registra fallo observable', async () => {
    const telemetry = new RecordingTelemetryReporter();
    const generator = new OpenAiMeetingAgendaGenerator({
      nowMs: sequenceNow(3_000, 3_080),
      responses: {
        createStructuredResponse: async () => ({
          output: { body: 'a'.repeat(4_001) },
          usage: { inputTokens: 500, cachedInputTokens: 0, outputTokens: 930 },
        }),
      },
      telemetry,
    });

    await expect(generator.draft(createAgendaInput())).rejects.toBeInstanceOf(OpenAiProviderError);
    expect(telemetry.events).toEqual([
      expect.objectContaining({
        operation: 'meeting-agenda',
        promptVersion: 'meeting-agenda.v2',
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

function createAgendaInput(): Parameters<OpenAiMeetingAgendaGenerator['draft']>[0] {
  return {
    meeting: {
      id: 'meeting-ordinary-2026-09-18',
      sessionId: 'session-a',
      kind: 'ordinaria',
      title: 'Junta ordinaria',
      scheduledAt: new Date('2026-09-18T17:00:00.000Z'),
      reviewPeriod: {
        startsAt: new Date('2026-04-30T08:30:00.000Z'),
        endsAt: new Date('2026-07-29T08:30:00.000Z'),
      },
    },
    items: [
      {
        description: 'Fuga de agua urgente en el garaje',
        priority: 'urgente',
        sourceType: 'incident',
        sourceId: 'inc-urgent',
        status: 'pendiente',
        resolvedAt: null,
      },
    ],
  };
}
