import { describe, expect, it } from 'vitest';
import { createMeetingMinutesDraft } from './MeetingMinutesDraft.js';

describe('createMeetingMinutesDraft', () => {
  it('genera un acta formal a partir de notas y acuerdos explícitos', () => {
    expect(
      createMeetingMinutesDraft(
        [
          'Junta ordinaria del 12 de junio.',
          'Asisten Ana, Luis y Marta.',
          'Acuerdo: aprobar el presupuesto de mantenimiento.',
          'Tarea: Solicitar tres presupuestos de jardinería; Responsable: Luis; Fecha: 30/06/2026',
        ].join('\n'),
      ),
    ).toEqual({
      title: 'Acta de reunión',
      body: [
        'Acta de reunión',
        '',
        'Notas aportadas:',
        '- Junta ordinaria del 12 de junio.',
        '- Asisten Ana, Luis y Marta.',
        '',
        'Acuerdos:',
        '- aprobar el presupuesto de mantenimiento.',
        '',
        'Tareas:',
        '- Solicitar tres presupuestos de jardinería. Responsable: Luis. Fecha: 30/06/2026.',
      ].join('\n'),
      tasks: [
        {
          assignee: 'Luis',
          description: 'Solicitar tres presupuestos de jardinería',
          dueDate: '30/06/2026',
        },
      ],
    });
  });

  it('no inventa tareas cuando las notas no contienen tareas explícitas', () => {
    expect(
      createMeetingMinutesDraft(
        ['Se revisa el estado de la piscina.', 'Acuerdo: mantener el horario actual.'].join('\n'),
      ),
    ).toEqual(
      expect.objectContaining({
        body: expect.stringContaining('No se han indicado tareas pendientes.'),
        tasks: [],
      }),
    );
  });

  it('usa las notas como contenido principal cuando no hay acuerdos explícitos', () => {
    expect(createMeetingMinutesDraft('Reunión para revisar incidencias del garaje.')).toEqual(
      expect.objectContaining({
        body: expect.stringContaining('- Reunión para revisar incidencias del garaje.'),
        tasks: [],
      }),
    );
  });
});
