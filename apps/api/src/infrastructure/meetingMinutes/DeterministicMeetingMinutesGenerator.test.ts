import { describe, expect, it } from 'vitest';
import { DeterministicMeetingMinutesGenerator } from './DeterministicMeetingMinutesGenerator.js';

describe('DeterministicMeetingMinutesGenerator', () => {
  it('genera actas demo con acuerdos estructurados y modo determinista', async () => {
    const generator = new DeterministicMeetingMinutesGenerator();

    await expect(
      generator.draft(
        [
          'Junta ordinaria.',
          'Acuerdo: aprobar presupuesto.',
          'Tarea: Revisar contrato; Responsable: Ana',
        ].join('\n'),
      ),
    ).resolves.toEqual({
      draft: {
        title: 'Acta de reunión',
        body: expect.stringContaining('aprobar presupuesto.'),
        agreements: ['aprobar presupuesto.'],
        tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
      },
      mode: 'deterministic-demo',
    });
  });
});
