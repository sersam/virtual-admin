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

    const parsedResponse = MeetingMinutesDraftResponseSchema.parse({
      draft: {
        title: 'Acta de reunión',
        body: 'Acta de reunión\n\nAcuerdos:\n- aprobar presupuesto.',
        agreements: ['aprobar presupuesto.'],
        tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
      },
      mode: 'openai',
    });

    expect(parsedResponse).toMatchObject({ draft: { title: 'Acta de reunión' }, mode: 'openai' });
    expect(parsedResponse.draft.agreements).toEqual(['aprobar presupuesto.']);
  });

  it('rechaza notas demasiado cortas y respuestas incompletas', () => {
    expect(() => MeetingMinutesDraftRequestSchema.parse({ notes: 'Acta' })).toThrow();
    expect(() =>
      MeetingMinutesDraftResponseSchema.parse({
        draft: { title: '', body: 'Contenido', agreements: [], tasks: [] },
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
          agreements: [],
          tasks: [{ description: '' }],
        },
        mode: 'deterministic-demo',
      }),
    ).toThrow();
  });

  it('rechaza acuerdos vacios o fuera de limite', () => {
    expect(() =>
      MeetingMinutesDraftResponseSchema.parse({
        draft: {
          title: 'Acta',
          body: 'Contenido valido',
          agreements: [''],
          tasks: [],
        },
        mode: 'deterministic-demo',
      }),
    ).toThrow();

    expect(() =>
      MeetingMinutesDraftResponseSchema.parse({
        draft: {
          title: 'Acta',
          body: 'Contenido valido',
          agreements: ['a'.repeat(241)],
          tasks: [],
        },
        mode: 'deterministic-demo',
      }),
    ).toThrow();
  });

  it('acepta hasta 50 acuerdos y rechaza 51 acuerdos', () => {
    const fiftyAgreements = Array.from({ length: 50 }, (_, index) => `Acuerdo ${index + 1}`);

    expect(
      MeetingMinutesDraftResponseSchema.parse({
        draft: {
          title: 'Acta',
          body: 'Contenido valido',
          agreements: fiftyAgreements,
          tasks: [],
        },
        mode: 'deterministic-demo',
      }).draft.agreements,
    ).toHaveLength(50);

    expect(() =>
      MeetingMinutesDraftResponseSchema.parse({
        draft: {
          title: 'Acta',
          body: 'Contenido valido',
          agreements: [...fiftyAgreements, 'Acuerdo 51'],
          tasks: [],
        },
        mode: 'deterministic-demo',
      }),
    ).toThrow();
  });
});
