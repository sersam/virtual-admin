import { describe, expect, it } from 'vitest';
import {
  MeetingAgendaDraftRequestSchema,
  MeetingAgendaDraftResponseSchema,
} from './meetingAgendas.js';

describe('meeting agenda contracts', () => {
  it('valida la petición vacía para generar un orden del día', () => {
    expect(MeetingAgendaDraftRequestSchema.parse({})).toEqual({});
  });

  it('valida un borrador trazable con incidencias y acuerdos pendientes', () => {
    const response = MeetingAgendaDraftResponseSchema.parse({
      draft: {
        title: 'Orden del día',
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
      mode: 'deterministic-demo',
    });

    expect(response.draft.items).toHaveLength(2);
  });
});
