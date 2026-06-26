import { describe, expect, it } from 'vitest';
import { createLocalMeetingMinutesDraft } from './localMeetingMinutesDraft';

describe('createLocalMeetingMinutesDraft', () => {
  it('redacta un borrador local estructurado', () => {
    expect(
      createLocalMeetingMinutesDraft(
        [
          'Junta ordinaria del 12 de junio.',
          'Acuerdo: aprobar presupuesto.',
          'Tarea: Revisar contrato; Responsable: Ana',
        ].join('\n'),
      ),
    ).toEqual({
      draft: {
        title: 'Acta de reunión',
        body: expect.stringContaining('Acuerdos:'),
        tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
      },
      mode: 'deterministic-demo',
    });
  });

  it('rechaza notas demasiado cortas', () => {
    expect(() => createLocalMeetingMinutesDraft('Acta')).toThrow();
  });
});
