import { describe, expect, it } from 'vitest';
import { DraftMeetingAgenda } from './DraftMeetingAgenda.js';

describe('DraftMeetingAgenda', () => {
  it('combina incidencias y acuerdos pendientes priorizados para la sesión', async () => {
    const useCase = new DraftMeetingAgenda({
      incidentRepository: {
        listBySession: async () => [
          {
            id: 'inc-low',
            sessionId: 'session-a',
            description: 'Pintura desconchada en el portal',
            type: 'otro',
            priority: 'baja',
            suggestedResponsible: 'Administrador',
            createdAt: new Date('2026-06-23T10:00:00.000Z'),
          },
          {
            id: 'inc-urgent',
            sessionId: 'session-a',
            description: 'Fuga de agua urgente en el garaje',
            type: 'agua',
            priority: 'urgente',
            suggestedResponsible: 'Fontanería',
            createdAt: new Date('2026-06-23T11:00:00.000Z'),
          },
        ],
        save: async () => {
          /* no-op */
        },
      },
      pendingAgreementRepository: {
        listBySession: async () => [
          {
            id: 'pending-with-date',
            sessionId: 'session-a',
            description: 'Revisar contrato de limpieza',
            assignee: 'Ana',
            dueDate: '30 de junio',
            createdAt: new Date('2026-06-23T09:00:00.000Z'),
          },
          {
            id: 'pending-without-date',
            sessionId: 'session-a',
            description: 'Pedir presupuesto de pintura',
            createdAt: new Date('2026-06-23T08:00:00.000Z'),
          },
        ],
        save: async () => {
          /* no-op */
        },
      },
    });

    await expect(useCase.execute({ sessionId: 'session-a' })).resolves.toEqual({
      draft: {
        title: 'Orden del día',
        body: [
          'Orden del día',
          '',
          '1. [Urgente] Fuga de agua urgente en el garaje',
          '   Origen: incidencia inc-urgent.',
          '2. [Alta] Revisar contrato de limpieza',
          '   Origen: acuerdo pendiente pending-with-date. Responsable: Ana. Fecha: 30 de junio.',
          '3. [Media] Pedir presupuesto de pintura',
          '   Origen: acuerdo pendiente pending-without-date.',
          '4. [Baja] Pintura desconchada en el portal',
          '   Origen: incidencia inc-low.',
        ].join('\n'),
        items: [
          {
            description: 'Fuga de agua urgente en el garaje',
            priority: 'urgente',
            sourceType: 'incident',
            sourceId: 'inc-urgent',
          },
          {
            description: 'Revisar contrato de limpieza',
            priority: 'alta',
            sourceType: 'pending-agreement',
            sourceId: 'pending-with-date',
            assignee: 'Ana',
            dueDate: '30 de junio',
          },
          {
            description: 'Pedir presupuesto de pintura',
            priority: 'media',
            sourceType: 'pending-agreement',
            sourceId: 'pending-without-date',
          },
          {
            description: 'Pintura desconchada en el portal',
            priority: 'baja',
            sourceType: 'incident',
            sourceId: 'inc-low',
          },
        ],
      },
      mode: 'deterministic-demo',
    });
  });

  it('devuelve un borrador vacío válido cuando no hay entradas pendientes', async () => {
    const useCase = new DraftMeetingAgenda({
      incidentRepository: {
        listBySession: async () => [],
        save: async () => {
          /* no-op */
        },
      },
      pendingAgreementRepository: {
        listBySession: async () => [],
        save: async () => {
          /* no-op */
        },
      },
    });

    await expect(useCase.execute({ sessionId: 'session-a' })).resolves.toEqual({
      draft: {
        title: 'Orden del día',
        body: 'No hay asuntos pendientes para incluir en el orden del día.',
        items: [],
      },
      mode: 'deterministic-demo',
    });
  });
});
