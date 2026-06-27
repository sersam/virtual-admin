import { describe, expect, it } from 'vitest';
import {
  MeetingMinutesDraftRequestSchema,
  MeetingMinutesDraftResponseSchema,
} from './meetingMinutes.js';

describe('meeting minutes contracts', () => {
  it('valida peticiones y respuestas de borrador de acta', () => {
    expect(
      MeetingMinutesDraftRequestSchema.parse({
        notes: '  Acuerdo: aprobar presupuesto.\nTarea: Revisar contrato; Responsable: Ana  ',
      }),
    ).toEqual({
      notes: 'Acuerdo: aprobar presupuesto.\nTarea: Revisar contrato; Responsable: Ana',
    });

    expect(
      MeetingMinutesDraftResponseSchema.parse({
        draft: {
          title: 'Acta de reunión',
          body: 'Acta de reunión\n\nAcuerdos:\n- aprobar presupuesto.',
          tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
        },
        mode: 'deterministic-demo',
      }),
    ).toMatchObject({ draft: { title: 'Acta de reunión' } });
  });

  it('rechaza notas demasiado cortas y respuestas incompletas', () => {
    expect(() => MeetingMinutesDraftRequestSchema.parse({ notes: 'Acta' })).toThrow();
    expect(() =>
      MeetingMinutesDraftResponseSchema.parse({
        draft: { title: '', body: 'Contenido', tasks: [] },
        mode: 'deterministic-demo',
      }),
    ).toThrow();
  });

  it('acepta longitudes límite y rechaza tareas inválidas', () => {
    expect(MeetingMinutesDraftRequestSchema.parse({ notes: 'a'.repeat(4_000) })).toEqual({
      notes: 'a'.repeat(4_000),
    });

    expect(() =>
      MeetingMinutesDraftResponseSchema.parse({
        draft: {
          title: 'Acta',
          body: 'Contenido válido',
          tasks: [{ description: '' }],
        },
        mode: 'deterministic-demo',
      }),
    ).toThrow();
  });
});
