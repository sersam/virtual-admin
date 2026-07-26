import { describe, expect, it } from 'vitest';
import {
  MeetingAgendaDraftRequestSchema,
  MeetingAgendaDraftResponseSchema,
  MeetingAgendaItemSchema,
} from './meetingAgendas.js';

describe('meeting agenda contracts', () => {
  it('valida la petición con junta seleccionada para generar un orden del día', () => {
    expect(
      MeetingAgendaDraftRequestSchema.parse({ meetingId: 'meeting-ordinary-2026-09-18' }),
    ).toEqual({
      meetingId: 'meeting-ordinary-2026-09-18',
    });
  });

  it('rechaza campos desconocidos en la petición', () => {
    expect(() =>
      MeetingAgendaDraftRequestSchema.parse({
        meetingId: 'meeting-ordinary-2026-09-18',
        sessionId: 'session-a',
      }),
    ).toThrow();
  });

  it('rechaza peticiones sin junta seleccionada', () => {
    expect(() => MeetingAgendaDraftRequestSchema.parse({})).toThrow();
  });

  it('rechaza identificadores de junta vacíos, en blanco o demasiado largos', () => {
    expect(() => MeetingAgendaDraftRequestSchema.parse({ meetingId: '' })).toThrow();
    expect(() => MeetingAgendaDraftRequestSchema.parse({ meetingId: '   ' })).toThrow();
    expect(() => MeetingAgendaDraftRequestSchema.parse({ meetingId: 'a'.repeat(81) })).toThrow();
  });

  it('valida un borrador trazable con incidencias y acuerdos pendientes', () => {
    const response = MeetingAgendaDraftResponseSchema.parse({
      draft: {
        title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
        body: '1. Incidencia urgente',
        items: [
          {
            description: 'Incidencia urgente',
            priority: 'urgente',
            sourceType: 'incident',
            sourceId: 'inc-1',
          },
          {
            description: 'Revisar contrato',
            priority: 'alta',
            sourceType: 'pending-agreement',
            sourceId: 'pending-1',
            assignee: 'Ana',
            dueDate: '30 de junio',
          },
        ],
      },
      meeting: {
        id: 'meeting-ordinary-2026-09-18',
        kind: 'ordinaria',
        title: 'Junta ordinaria',
        scheduledAt: '2026-09-18T17:00:00.000Z',
      },
      mode: 'deterministic-demo',
    });

    expect(response.draft.items).toHaveLength(2);
    expect(response.meeting).toEqual({
      id: 'meeting-ordinary-2026-09-18',
      kind: 'ordinaria',
      title: 'Junta ordinaria',
      scheduledAt: '2026-09-18T17:00:00.000Z',
    });
  });

  it('rechaza modos de respuesta no soportados', () => {
    expect(() =>
      MeetingAgendaDraftResponseSchema.parse({
        draft: {
          title: 'Orden del día',
          body: '1. Incidencia urgente',
          items: [],
        },
        meeting: {
          id: 'meeting-ordinary-2026-09-18',
          kind: 'ordinaria',
          title: 'Junta ordinaria',
          scheduledAt: '2026-09-18T17:00:00.000Z',
        },
        mode: 'remote-ai',
      }),
    ).toThrow();
  });

  it('rechaza orígenes de entrada no soportados', () => {
    expect(() =>
      MeetingAgendaDraftResponseSchema.parse({
        draft: {
          title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
          body: '1. Incidencia urgente',
          items: [
            {
              description: 'Incidencia urgente',
              priority: 'urgente',
              sourceType: 'document',
              sourceId: 'doc-1',
            },
          ],
        },
        meeting: {
          id: 'meeting-ordinary-2026-09-18',
          kind: 'ordinaria',
          title: 'Junta ordinaria',
          scheduledAt: '2026-09-18T17:00:00.000Z',
        },
        mode: 'deterministic-demo',
      }),
    ).toThrow();
  });

  it('acepta propuestas vecinales trazables sin prioridad', () => {
    expect(
      MeetingAgendaItemSchema.parse({
        description: 'Instalar aparcabicis en el patio interior.',
        sourceType: 'proposal',
        sourceId: 'proposal-0001',
      }),
    ).toEqual({
      description: 'Instalar aparcabicis en el patio interior.',
      sourceType: 'proposal',
      sourceId: 'proposal-0001',
    });

    expect(() =>
      MeetingAgendaItemSchema.parse({
        description: 'Instalar aparcabicis en el patio interior.',
        priority: 'media',
        sourceType: 'proposal',
        sourceId: 'proposal-0001',
      }),
    ).toThrow();
  });
});
