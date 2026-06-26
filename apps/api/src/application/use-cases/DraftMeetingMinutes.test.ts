import { describe, expect, it } from 'vitest';
import { DraftMeetingMinutes } from './DraftMeetingMinutes.js';

describe('DraftMeetingMinutes', () => {
  it('devuelve un borrador estructurado para transporte API', async () => {
    const useCase = new DraftMeetingMinutes();

    await expect(
      useCase.execute(
        [
          'Junta ordinaria.',
          'Acuerdo: aprobar presupuesto.',
          'Tarea: Revisar contrato; Responsable: Ana',
        ].join('\n'),
      ),
    ).resolves.toEqual({
      draft: {
        title: 'Acta de reunión',
        body: expect.stringContaining('Acuerdos:'),
        tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
      },
      mode: 'deterministic-demo',
    });
  });
});
