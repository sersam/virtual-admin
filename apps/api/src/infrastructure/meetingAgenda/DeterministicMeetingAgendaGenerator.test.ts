import { describe, expect, it } from 'vitest';
import { DeterministicMeetingAgendaGenerator } from './DeterministicMeetingAgendaGenerator.js';

describe('DeterministicMeetingAgendaGenerator', () => {
  it('mantiene el cuerpo demo con prioridades, detalles de origen y propuestas al final', async () => {
    const generator = new DeterministicMeetingAgendaGenerator();

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
            sourceId: 'pending-with-date',
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
            sourceId: 'proposal-1',
          },
        ],
      }),
    ).resolves.toEqual({
      body: [
        'Orden del día',
        '',
        '1. [Urgente] Fuga de agua urgente en el garaje',
        '   Origen: incidencia inc-urgent.',
        '2. [Alta] Revisar contrato de limpieza',
        '   Origen: acuerdo pendiente pending-with-date. Responsable: Ana. Fecha: 30 de junio. Fecha límite estructurada: 2026-06-30.',
        '3. [Media] Fuga de agua ya reparada',
        '   Origen: incidencia inc-resolved. Resuelta el 24 de junio de 2026.',
        '4. Instalar aparcabicis en el patio interior.',
      ].join('\n'),
      mode: 'deterministic-demo',
    });
  });

  it('abrevia por bloques completos sin truncar entradas estructuradas', async () => {
    const generator = new DeterministicMeetingAgendaGenerator();
    const longDescription = 'a'.repeat(990);

    const response = await generator.draft({
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
      items: Array.from({ length: 5 }, (_, index) => ({
        description: `${longDescription}${index}`,
        sourceType: 'proposal' as const,
        sourceId: `proposal-${index + 1}`,
      })),
    });

    expect(response.body.length).toBeLessThanOrEqual(4_000);
    expect(response.body).toContain('1. ');
    expect(response.body).toContain('3. ');
    expect(response.body).not.toContain('5. ');
    expect(response.body).toContain(
      'Contenido abreviado por el límite del borrador. Consulta «Entradas utilizadas» para ver todas las fuentes.',
    );
  });
});
