import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';
import type { PendingAgreement } from '../../domain/meetingAgenda/PendingAgreement.js';
import type { CommunityMeeting } from '../../domain/meeting/CommunityMeeting.js';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';
import type { IncidentRepository } from '../ports/IncidentRepository.js';
import type { MeetingRepository } from '../ports/MeetingRepository.js';
import type { PendingAgreementRepository } from '../ports/PendingAgreementRepository.js';
import type { ProposalRepository } from '../ports/ProposalRepository.js';
import { describe, expect, it } from 'vitest';
import { DraftMeetingAgenda } from './DraftMeetingAgenda.js';

function suggestedNoticeFor(description: string): string {
  return [
    'Estimados vecinos:',
    '',
    `Se ha registrado la siguiente incidencia: ${description}`,
    '',
    'La administración comunicará cualquier novedad relevante.',
  ].join('\n');
}

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
            suggestedNotice: suggestedNoticeFor('Pintura desconchada en el portal'),
            createdAt: new Date('2026-06-23T10:00:00.000Z'),
            status: 'pendiente',
            resolvedAt: null,
          },
          {
            id: 'inc-urgent',
            sessionId: 'session-a',
            description: 'Fuga de agua urgente en el garaje',
            type: 'agua',
            priority: 'urgente',
            suggestedResponsible: 'Fontanería',
            suggestedNotice: suggestedNoticeFor('Fuga de agua urgente en el garaje'),
            createdAt: new Date('2026-06-23T11:00:00.000Z'),
            status: 'pendiente',
            resolvedAt: null,
          },
        ],
        resolve: async () => undefined,
        save: async () => {
          /* no-op */
        },
        saveIfAbsent: async () => {
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
        saveIfAbsent: async () => {
          /* no-op */
        },
      },
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository(),
    });

    await expect(
      useCase.execute({ sessionId: 'session-a', meetingId: 'meeting-ordinary-2026-09-18' }),
    ).resolves.toEqual({
      draft: {
        title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
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
      meeting: {
        id: 'meeting-ordinary-2026-09-18',
        kind: 'ordinaria',
        title: 'Junta ordinaria',
        scheduledAt: '2026-09-18T17:00:00.000Z',
      },
      mode: 'deterministic-demo',
    });
  });

  it('devuelve un borrador vacío válido cuando no hay entradas pendientes', async () => {
    const useCase = new DraftMeetingAgenda({
      incidentRepository: {
        listBySession: async () => [],
        resolve: async () => undefined,
        save: async () => {
          /* no-op */
        },
        saveIfAbsent: async () => {
          /* no-op */
        },
      },
      pendingAgreementRepository: {
        listBySession: async () => [],
        save: async () => {
          /* no-op */
        },
        saveIfAbsent: async () => {
          /* no-op */
        },
      },
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository(),
    });

    await expect(
      useCase.execute({ sessionId: 'session-a', meetingId: 'meeting-ordinary-2026-09-18' }),
    ).resolves.toEqual({
      draft: {
        title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
        body: 'No hay asuntos pendientes para incluir en el orden del día.',
        items: [],
      },
      meeting: expect.objectContaining({
        id: 'meeting-ordinary-2026-09-18',
      }),
      mode: 'deterministic-demo',
    });
  });

  it('falla si la junta no existe en la sesion', async () => {
    const useCase = new DraftMeetingAgenda({
      incidentRepository: createIncidentRepository([]),
      pendingAgreementRepository: createPendingAgreementRepository([]),
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository(),
    });

    await expect(
      useCase.execute({ sessionId: 'session-a', meetingId: 'meeting-missing' }),
    ).rejects.toThrow('No se ha encontrado la junta seleccionada.');
  });

  it('ignora incidencias resueltas al preparar el orden del día', async () => {
    const useCase = new DraftMeetingAgenda({
      incidentRepository: createIncidentRepository([
        createIncident({
          id: 'inc-pending',
          description: 'Revisar puerta del garaje',
        }),
        createResolvedIncident({
          id: 'inc-resolved',
          description: 'Fuga de agua ya reparada',
        }),
      ]),
      pendingAgreementRepository: createPendingAgreementRepository([]),
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository(),
    });

    const response = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-ordinary-2026-09-18',
    });

    expect(response.draft.items).toEqual([
      expect.objectContaining({
        description: 'Revisar puerta del garaje',
        sourceId: 'inc-pending',
      }),
    ]);
    expect(response.draft.body).not.toContain('Fuga de agua ya reparada');
  });

  it('anade propuestas al final sin prioridad y en orden de antiguedad', async () => {
    const useCase = new DraftMeetingAgenda({
      incidentRepository: createIncidentRepository([
        createIncident({
          id: 'inc-urgent',
          description: 'Fuga de agua urgente en el garaje',
          priority: 'urgente',
          createdAt: new Date('2026-06-23T11:00:00.000Z'),
        }),
      ]),
      pendingAgreementRepository: createPendingAgreementRepository([
        createPendingAgreement({
          id: 'pending-a',
          description: 'Revisar contrato de limpieza',
          dueDate: '30 de junio',
          createdAt: new Date('2026-06-23T09:00:00.000Z'),
        }),
      ]),
      proposalRepository: createProposalRepository([
        createProposal({
          id: 'proposal-new',
          description: 'Crear una zona de compostaje comunitario.',
          createdAt: new Date('2026-07-26T10:00:00.000Z'),
        }),
        createProposal({
          id: 'proposal-old',
          description: 'Instalar aparcabicis en el patio interior.',
          createdAt: new Date('2026-07-26T09:00:00.000Z'),
        }),
      ]),
      meetingRepository: createMeetingRepository(),
    });

    const response = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-ordinary-2026-09-18',
    });

    expect(response.draft.items).toEqual([
      expect.objectContaining({ sourceId: 'inc-urgent', priority: 'urgente' }),
      expect.objectContaining({ sourceId: 'pending-a', priority: 'alta' }),
      {
        description: 'Instalar aparcabicis en el patio interior.',
        sourceType: 'proposal',
        sourceId: 'proposal-old',
      },
      {
        description: 'Crear una zona de compostaje comunitario.',
        sourceType: 'proposal',
        sourceId: 'proposal-new',
      },
    ]);
    expect(response.draft.body).toContain('3. Instalar aparcabicis en el patio interior.');
    expect(response.draft.body).toContain('4. Crear una zona de compostaje comunitario.');
    expect(response.draft.body).not.toContain('[Media] Instalar aparcabicis');
    expect(response.draft.body).not.toContain('Origen: propuesta');
  });

  it('limita el orden del día a las 100 entradas más prioritarias', async () => {
    const useCase = new DraftMeetingAgenda({
      incidentRepository: createIncidentRepository(
        Array.from({ length: 101 }, (_, index) =>
          createIncident({
            id: `inc-${String(index + 1).padStart(3, '0')}`,
            description: `Incidencia ${index + 1}`,
            createdAt: new Date(new Date('2026-06-23T10:00:00.000Z').getTime() + index * 60_000),
          }),
        ),
      ),
      pendingAgreementRepository: createPendingAgreementRepository([]),
      proposalRepository: createProposalRepository([
        createProposal({
          id: 'proposal-excluded',
          createdAt: new Date('2026-06-22T10:00:00.000Z'),
        }),
      ]),
      meetingRepository: createMeetingRepository(),
    });

    const response = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-ordinary-2026-09-18',
    });

    expect(response.draft.items).toHaveLength(100);
    expect(response.draft.items.at(-1)).toEqual(expect.objectContaining({ sourceId: 'inc-100' }));
    expect(response.draft.body).not.toContain('Incidencia 101');
    expect(response.draft.items).not.toContainEqual(
      expect.objectContaining({ sourceId: 'proposal-excluded' }),
    );
  });

  it('ordena de forma determinista cuando prioridad y fecha coinciden', async () => {
    const sharedCreatedAt = new Date('2026-06-23T10:00:00.000Z');
    const useCase = new DraftMeetingAgenda({
      incidentRepository: createIncidentRepository([
        createIncident({ id: 'inc-b', createdAt: sharedCreatedAt }),
        createIncident({ id: 'inc-a', createdAt: sharedCreatedAt }),
      ]),
      pendingAgreementRepository: createPendingAgreementRepository([
        createPendingAgreement({ id: 'pending-a', createdAt: sharedCreatedAt }),
      ]),
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository(),
    });

    const response = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-ordinary-2026-09-18',
    });

    expect(response.draft.items.map((item) => item.sourceId)).toEqual([
      'inc-a',
      'inc-b',
      'pending-a',
    ]);
  });

  it('usa únicamente entradas de la sesión solicitada', async () => {
    const useCase = new DraftMeetingAgenda({
      incidentRepository: createIncidentRepository([
        createIncident({
          id: 'inc-session-a',
          description: 'Revisar cerradura del portal',
          sessionId: 'session-a',
        }),
        createIncident({
          id: 'inc-session-b',
          description: 'Incidencia de otra sesión',
          sessionId: 'session-b',
        }),
      ]),
      pendingAgreementRepository: createPendingAgreementRepository([
        createPendingAgreement({
          id: 'pending-session-a',
          description: 'Pedir presupuesto de jardinería',
          sessionId: 'session-a',
        }),
        createPendingAgreement({
          id: 'pending-session-b',
          description: 'Acuerdo de otra sesión',
          sessionId: 'session-b',
        }),
      ]),
      proposalRepository: createProposalRepository([
        createProposal({
          id: 'proposal-session-a',
          description: 'Instalar aparcabicis en el patio interior.',
          sessionId: 'session-a',
        }),
        createProposal({
          id: 'proposal-session-b',
          description: 'Propuesta de otra sesión',
          sessionId: 'session-b',
        }),
      ]),
      meetingRepository: createMeetingRepository(),
    });

    const response = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-ordinary-2026-09-18',
    });

    expect(response.draft.items.map((item) => item.sourceId)).toEqual([
      'inc-session-a',
      'pending-session-a',
      'proposal-session-a',
    ]);
    expect(response.draft.body).not.toContain('Incidencia de otra sesión');
    expect(response.draft.body).not.toContain('Acuerdo de otra sesión');
    expect(response.draft.body).not.toContain('Propuesta de otra sesión');
  });

  it('abrevia el cuerpo por bloques completos sin truncar entradas estructuradas', async () => {
    const longDescription = 'a'.repeat(990);
    const useCase = new DraftMeetingAgenda({
      incidentRepository: createIncidentRepository([]),
      pendingAgreementRepository: createPendingAgreementRepository([]),
      proposalRepository: createProposalRepository(
        Array.from({ length: 5 }, (_, index) =>
          createProposal({
            id: `proposal-${index + 1}`,
            description: `${longDescription}${index}`,
            createdAt: new Date(new Date('2026-07-26T09:00:00.000Z').getTime() + index * 60_000),
          }),
        ),
      ),
      meetingRepository: createMeetingRepository(),
    });

    const response = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-ordinary-2026-09-18',
    });

    expect(response.draft.items).toHaveLength(5);
    expect(response.draft.body.length).toBeLessThanOrEqual(4_000);
    expect(response.draft.body).toContain('1. ');
    expect(response.draft.body).toContain('3. ');
    expect(response.draft.body).not.toContain('5. ');
    expect(response.draft.body).toContain(
      'Contenido abreviado por el límite del borrador. Consulta «Entradas utilizadas» para ver todas las fuentes.',
    );
  });

  it('propaga errores al listar incidencias', async () => {
    const useCase = new DraftMeetingAgenda({
      incidentRepository: {
        ...createIncidentRepository([]),
        listBySession: async () => {
          throw new Error('incidents unavailable');
        },
      },
      pendingAgreementRepository: createPendingAgreementRepository([]),
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository(),
    });

    await expect(
      useCase.execute({ sessionId: 'session-a', meetingId: 'meeting-ordinary-2026-09-18' }),
    ).rejects.toThrow('incidents unavailable');
  });

  it('propaga errores al listar acuerdos pendientes', async () => {
    const useCase = new DraftMeetingAgenda({
      incidentRepository: createIncidentRepository([]),
      pendingAgreementRepository: {
        ...createPendingAgreementRepository([]),
        listBySession: async () => {
          throw new Error('pending agreements unavailable');
        },
      },
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository(),
    });

    await expect(
      useCase.execute({ sessionId: 'session-a', meetingId: 'meeting-ordinary-2026-09-18' }),
    ).rejects.toThrow('pending agreements unavailable');
  });
});

function createIncidentRepository(incidents: readonly CommunityIncident[]): IncidentRepository {
  return {
    listBySession: async (sessionId) =>
      incidents.filter((incident) => incident.sessionId === sessionId),
    resolve: async () => undefined,
    save: async () => {
      /* no-op */
    },
    saveIfAbsent: async () => {
      /* no-op */
    },
  };
}

function createProposalRepository(proposals: readonly CommunityProposal[]): ProposalRepository {
  return {
    listBySession: async (sessionId) =>
      proposals.filter((proposal) => proposal.sessionId === sessionId),
    save: async () => undefined,
  };
}

function createPendingAgreementRepository(
  agreements: readonly PendingAgreement[],
): PendingAgreementRepository {
  return {
    listBySession: async (sessionId) =>
      agreements.filter((agreement) => agreement.sessionId === sessionId),
    save: async () => {
      /* no-op */
    },
    saveIfAbsent: async () => {
      /* no-op */
    },
  };
}

function createMeetingRepository(
  meetings: readonly CommunityMeeting[] = [
    {
      id: 'meeting-ordinary-2026-09-18',
      sessionId: 'session-a',
      kind: 'ordinaria',
      title: 'Junta ordinaria',
      scheduledAt: new Date('2026-09-18T17:00:00.000Z'),
    },
  ],
): MeetingRepository {
  return {
    findBySession: async (sessionId, meetingId) =>
      meetings.find((meeting) => meeting.sessionId === sessionId && meeting.id === meetingId),
    listBySession: async (sessionId) =>
      meetings.filter((meeting) => meeting.sessionId === sessionId),
  };
}

type PendingIncidentOverrides = Partial<Omit<CommunityIncident, 'resolvedAt' | 'status'>>;

function createIncident(overrides: PendingIncidentOverrides = {}): CommunityIncident {
  const description = overrides.description ?? 'Incidencia pendiente';

  return {
    id: 'inc-1',
    sessionId: 'session-a',
    type: 'otro',
    priority: 'media',
    suggestedResponsible: 'Administrador',
    createdAt: new Date('2026-06-23T10:00:00.000Z'),
    ...overrides,
    description,
    suggestedNotice: overrides.suggestedNotice ?? suggestedNoticeFor(description),
    status: 'pendiente',
    resolvedAt: null,
  };
}

function createResolvedIncident(
  overrides: Partial<Omit<CommunityIncident, 'resolvedAt' | 'status'>> = {},
): CommunityIncident {
  const description = overrides.description ?? 'Incidencia resuelta';

  return {
    id: 'inc-resolved',
    sessionId: 'session-a',
    type: 'otro',
    priority: 'media',
    suggestedResponsible: 'Administrador',
    createdAt: new Date('2026-06-23T10:00:00.000Z'),
    ...overrides,
    description,
    suggestedNotice: overrides.suggestedNotice ?? suggestedNoticeFor(description),
    status: 'resuelta',
    resolvedAt: new Date('2026-06-24T10:00:00.000Z'),
  };
}

function createPendingAgreement(overrides: Partial<PendingAgreement> = {}): PendingAgreement {
  return {
    id: 'pending-1',
    sessionId: 'session-a',
    description: 'Acuerdo pendiente',
    createdAt: new Date('2026-06-23T10:00:00.000Z'),
    ...overrides,
  };
}

function createProposal(overrides: Partial<CommunityProposal> = {}): CommunityProposal {
  return {
    id: 'proposal-1',
    sessionId: 'session-a',
    description: 'Instalar aparcabicis en el patio interior.',
    createdAt: new Date('2026-07-26T10:00:00.000Z'),
    ...overrides,
  };
}
