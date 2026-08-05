import type { MeetingAgendaItem } from '@admin/contracts';
import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';
import type { PendingAgreement } from '../../domain/meetingAgenda/PendingAgreement.js';
import type { CommunityMeeting } from '../../domain/meeting/CommunityMeeting.js';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';
import type { IncidentRepository } from '../ports/IncidentRepository.js';
import type {
  MeetingAgendaDraftBody,
  MeetingAgendaGenerator,
  MeetingAgendaGeneratorInput,
} from '../ports/MeetingAgendaGenerator.js';
import type { MeetingRepository } from '../ports/MeetingRepository.js';
import type { PendingAgreementRepository } from '../ports/PendingAgreementRepository.js';
import type { ProposalRepository } from '../ports/ProposalRepository.js';
import { describe, expect, it } from 'vitest';
import { DeterministicMeetingAgendaGenerator } from '../../infrastructure/meetingAgenda/DeterministicMeetingAgendaGenerator.js';
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

const reviewPeriod = {
  startsAt: '2026-04-30T08:30:00.000Z',
  endsAt: '2026-07-29T08:30:00.000Z',
};

const filterExplanations = [
  'Junta ordinaria: se revisan los últimos 90 días hasta el momento de preparación.',
  'Incidencias: se incluyen pendientes disponibles antes de preparar la junta y resueltas dentro del período revisado.',
  'Acuerdos pendientes: si tienen fecha límite estructurada se usa esa fecha; si no, se usa la fecha de creación.',
  'Propuestas: se incluyen las disponibles antes de preparar la junta, aunque sean anteriores al inicio del período.',
];

describe('DraftMeetingAgenda', () => {
  it('combina incidencias y acuerdos pendientes priorizados para la sesión', async () => {
    const useCase = new DraftMeetingAgenda({
      generator: new DeterministicMeetingAgendaGenerator(),
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
            status: 'pendiente',
            resolvedAt: null,
          },
        ],
      },
      filterExplanations,
      meeting: {
        id: 'meeting-ordinary-2026-09-18',
        kind: 'ordinaria',
        title: 'Junta ordinaria',
        scheduledAt: '2026-09-18T17:00:00.000Z',
        reviewPeriod,
      },
      mode: 'deterministic-demo',
      reviewPeriod,
    });
  });

  it('devuelve un borrador vacío válido cuando no hay entradas pendientes', async () => {
    const generator = new RecordingMeetingAgendaGenerator({
      body: 'Este texto no debe usarse.',
      mode: 'openai',
    });
    const useCase = new DraftMeetingAgenda({
      generator,
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
      filterExplanations,
      meeting: expect.objectContaining({
        id: 'meeting-ordinary-2026-09-18',
      }),
      mode: 'deterministic-demo',
      reviewPeriod,
    });
    expect(generator.inputs).toEqual([]);
  });

  it('delega solo la redaccion y conserva titulo, junta y trazas controladas por la aplicacion', async () => {
    const generator = new RecordingMeetingAgendaGenerator({
      body: 'Texto redactado por OpenAI sin capacidad de alterar fuentes.',
      mode: 'openai',
    });
    const useCase = new DraftMeetingAgenda({
      generator,
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
          assignee: 'Ana',
          dueDate: '30 de junio',
          createdAt: new Date('2026-06-23T09:00:00.000Z'),
        }),
      ]),
      proposalRepository: createProposalRepository([
        createProposal({
          id: 'proposal-a',
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

    expect(generator.inputs).toEqual([
      {
        meeting: expect.objectContaining({
          id: 'meeting-ordinary-2026-09-18',
          title: 'Junta ordinaria',
        }),
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
            sourceId: 'pending-a',
            assignee: 'Ana',
            dueDate: '30 de junio',
          },
          {
            description: 'Instalar aparcabicis en el patio interior.',
            sourceType: 'proposal',
            sourceId: 'proposal-a',
          },
        ],
      },
    ]);
    expect(response).toEqual({
      draft: {
        title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
        body: 'Texto redactado por OpenAI sin capacidad de alterar fuentes.',
        items: generator.inputs[0]!.items,
      },
      filterExplanations,
      meeting: {
        id: 'meeting-ordinary-2026-09-18',
        kind: 'ordinaria',
        title: 'Junta ordinaria',
        scheduledAt: '2026-09-18T17:00:00.000Z',
        reviewPeriod,
      },
      mode: 'openai',
      reviewPeriod,
    });
  });

  it('falla si la junta no existe en la sesion', async () => {
    const useCase = new DraftMeetingAgenda({
      generator: new DeterministicMeetingAgendaGenerator(),
      incidentRepository: createIncidentRepository([]),
      pendingAgreementRepository: createPendingAgreementRepository([]),
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository(),
    });

    await expect(
      useCase.execute({ sessionId: 'session-a', meetingId: 'meeting-missing' }),
    ).rejects.toThrow('No se ha encontrado la junta seleccionada.');
  });

  it('incluye incidencias resueltas dentro del periodo y excluye las resueltas fuera', async () => {
    const useCase = new DraftMeetingAgenda({
      generator: new DeterministicMeetingAgendaGenerator(),
      incidentRepository: createIncidentRepository([
        createIncident({
          id: 'inc-pending',
          description: 'Revisar puerta del garaje',
        }),
        createResolvedIncident({
          id: 'inc-resolved-inside',
          description: 'Fuga de agua ya reparada',
          resolvedAt: new Date('2026-06-24T10:00:00.000Z'),
        }),
        createResolvedIncident({
          id: 'inc-resolved-before-period',
          description: 'Luz del trastero ya reparada',
          resolvedAt: new Date('2026-04-30T08:29:59.999Z'),
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
      expect.objectContaining({
        description: 'Fuga de agua ya reparada',
        resolvedAt: '2026-06-24T10:00:00.000Z',
        sourceId: 'inc-resolved-inside',
        status: 'resuelta',
      }),
    ]);
    expect(response.draft.body).toContain('Resuelta el 24 de junio de 2026');
    expect(response.draft.body).not.toContain('Luz del trastero ya reparada');
  });

  it('aplica limites temporales inclusivos para incidencias pendientes y resueltas', async () => {
    const useCase = new DraftMeetingAgenda({
      generator: new DeterministicMeetingAgendaGenerator(),
      incidentRepository: createIncidentRepository([
        createIncident({
          id: 'inc-created-at-start',
          createdAt: new Date('2026-04-30T08:30:00.000Z'),
        }),
        createIncident({
          id: 'inc-created-after-preparation',
          createdAt: new Date('2026-07-29T08:30:00.001Z'),
        }),
        createResolvedIncident({
          id: 'inc-resolved-at-end',
          resolvedAt: new Date('2026-07-29T08:30:00.000Z'),
        }),
        createResolvedIncident({
          id: 'inc-resolved-after-end',
          resolvedAt: new Date('2026-07-29T08:30:00.001Z'),
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

    expect(response.draft.items.map((item) => item.sourceId)).toEqual([
      'inc-created-at-start',
      'inc-resolved-at-end',
    ]);
  });

  it('filtra acuerdos por dueOn en calendario Madrid o por createdAt cuando no hay dueOn', async () => {
    const useCase = new DraftMeetingAgenda({
      generator: new DeterministicMeetingAgendaGenerator(),
      incidentRepository: createIncidentRepository([]),
      pendingAgreementRepository: createPendingAgreementRepository([
        createPendingAgreement({
          id: 'pending-due-on-start',
          dueDate: '30 de abril',
          dueOn: '2026-04-30',
          createdAt: new Date('2026-04-01T10:00:00.000Z'),
        }),
        createPendingAgreement({
          id: 'pending-due-on-before',
          dueDate: '29 de abril',
          dueOn: '2026-04-29',
          createdAt: new Date('2026-04-01T10:00:00.000Z'),
        }),
        createPendingAgreement({
          id: 'pending-created-inside',
          createdAt: new Date('2026-05-01T10:00:00.000Z'),
        }),
        createPendingAgreement({
          id: 'pending-created-before',
          createdAt: new Date('2026-04-30T08:29:59.999Z'),
        }),
        createPendingAgreement({
          id: 'pending-created-future',
          dueOn: '2026-05-10',
          createdAt: new Date('2026-07-29T08:30:00.001Z'),
        }),
      ]),
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository(),
    });

    const response = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-ordinary-2026-09-18',
    });

    expect(response.draft.items.map((item) => item.sourceId)).toEqual([
      'pending-due-on-start',
      'pending-created-inside',
    ]);
  });

  it('compara dueOn con el dia civil de Europe/Madrid', async () => {
    const useCase = new DraftMeetingAgenda({
      generator: new DeterministicMeetingAgendaGenerator(),
      incidentRepository: createIncidentRepository([]),
      pendingAgreementRepository: createPendingAgreementRepository([
        createPendingAgreement({
          id: 'pending-madrid-start',
          dueOn: '2026-05-01',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        }),
        createPendingAgreement({
          id: 'pending-madrid-before',
          dueOn: '2026-04-30',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        }),
      ]),
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository([
        createMeeting({
          reviewPeriod: {
            startsAt: new Date('2026-04-30T22:30:00.000Z'),
            endsAt: new Date('2026-05-02T08:30:00.000Z'),
          },
        }),
      ]),
    });

    const response = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-ordinary-2026-09-18',
    });

    expect(response.draft.items.map((item) => item.sourceId)).toEqual(['pending-madrid-start']);
  });

  it('anade propuestas al final sin prioridad y en orden de antiguedad', async () => {
    const useCase = new DraftMeetingAgenda({
      generator: new DeterministicMeetingAgendaGenerator(),
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

  it('incluye propuestas anteriores al periodo pero disponibles antes de preparar la junta', async () => {
    const useCase = new DraftMeetingAgenda({
      generator: new DeterministicMeetingAgendaGenerator(),
      incidentRepository: createIncidentRepository([]),
      pendingAgreementRepository: createPendingAgreementRepository([]),
      proposalRepository: createProposalRepository([
        createProposal({
          id: 'proposal-old-context',
          createdAt: new Date('2026-01-10T10:00:00.000Z'),
        }),
        createProposal({
          id: 'proposal-future',
          createdAt: new Date('2026-07-29T08:30:00.001Z'),
        }),
      ]),
      meetingRepository: createMeetingRepository(),
    });

    const response = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-ordinary-2026-09-18',
    });

    expect(response.draft.items.map((item) => item.sourceId)).toEqual(['proposal-old-context']);
  });

  it('usa ventanas distintas para juntas ordinarias y extraordinarias', async () => {
    const meetings = [
      createMeeting({
        id: 'meeting-ordinary-2026-09-18',
        kind: 'ordinaria',
        reviewPeriod: {
          startsAt: new Date('2026-04-30T08:30:00.000Z'),
          endsAt: new Date('2026-07-29T08:30:00.000Z'),
        },
      }),
      createMeeting({
        id: 'meeting-extraordinary-2026-10-15',
        kind: 'extraordinaria',
        title: 'Junta extraordinaria',
        reviewPeriod: {
          startsAt: new Date('2026-06-29T08:30:00.000Z'),
          endsAt: new Date('2026-07-29T08:30:00.000Z'),
        },
      }),
    ];
    const dependencies = {
      generator: new DeterministicMeetingAgendaGenerator(),
      incidentRepository: createIncidentRepository([
        createResolvedIncident({
          id: 'inc-resolved-ordinary-only',
          resolvedAt: new Date('2026-06-10T10:00:00.000Z'),
        }),
        createResolvedIncident({
          id: 'inc-resolved-both',
          resolvedAt: new Date('2026-07-10T10:00:00.000Z'),
        }),
      ]),
      pendingAgreementRepository: createPendingAgreementRepository([]),
      proposalRepository: createProposalRepository([]),
      meetingRepository: createMeetingRepository(meetings),
    };
    const useCase = new DraftMeetingAgenda(dependencies);

    const ordinary = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-ordinary-2026-09-18',
    });
    const extraordinary = await useCase.execute({
      sessionId: 'session-a',
      meetingId: 'meeting-extraordinary-2026-10-15',
    });

    expect(ordinary.draft.items.map((item) => item.sourceId)).toEqual([
      'inc-resolved-both',
      'inc-resolved-ordinary-only',
    ]);
    expect(extraordinary.draft.items.map((item) => item.sourceId)).toEqual(['inc-resolved-both']);
  });

  it('limita el orden del día a las 100 entradas más prioritarias', async () => {
    const useCase = new DraftMeetingAgenda({
      generator: new DeterministicMeetingAgendaGenerator(),
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
      generator: new DeterministicMeetingAgendaGenerator(),
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
      generator: new DeterministicMeetingAgendaGenerator(),
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
      generator: new DeterministicMeetingAgendaGenerator(),
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
      generator: new DeterministicMeetingAgendaGenerator(),
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
      generator: new DeterministicMeetingAgendaGenerator(),
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

  it('propaga errores al listar propuestas', async () => {
    const useCase = new DraftMeetingAgenda({
      generator: new DeterministicMeetingAgendaGenerator(),
      incidentRepository: createIncidentRepository([]),
      pendingAgreementRepository: createPendingAgreementRepository([]),
      proposalRepository: {
        ...createProposalRepository([]),
        listBySession: async () => {
          throw new Error('proposals unavailable');
        },
      },
      meetingRepository: createMeetingRepository(),
    });

    await expect(
      useCase.execute({ sessionId: 'session-a', meetingId: 'meeting-ordinary-2026-09-18' }),
    ).rejects.toThrow('proposals unavailable');
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
  meetings: readonly CommunityMeeting[] = [createMeeting()],
): MeetingRepository {
  return {
    findBySession: async (sessionId, meetingId) =>
      meetings.find((meeting) => meeting.sessionId === sessionId && meeting.id === meetingId),
    listBySession: async (sessionId) =>
      meetings.filter((meeting) => meeting.sessionId === sessionId),
  };
}

function createMeeting(overrides: Partial<CommunityMeeting> = {}): CommunityMeeting {
  return {
    id: 'meeting-ordinary-2026-09-18',
    sessionId: 'session-a',
    kind: 'ordinaria',
    title: 'Junta ordinaria',
    scheduledAt: new Date('2026-09-18T17:00:00.000Z'),
    reviewPeriod: {
      startsAt: new Date('2026-04-30T08:30:00.000Z'),
      endsAt: new Date('2026-07-29T08:30:00.000Z'),
    },
    ...overrides,
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
  overrides: Partial<Omit<CommunityIncident, 'status'>> = {},
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
    resolvedAt: overrides.resolvedAt ?? new Date('2026-06-24T10:00:00.000Z'),
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

class RecordingMeetingAgendaGenerator implements MeetingAgendaGenerator {
  readonly inputs: Array<{
    readonly items: readonly MeetingAgendaItem[];
    readonly meeting: CommunityMeeting;
  }> = [];

  constructor(private readonly result: MeetingAgendaDraftBody) {}

  async draft(input: MeetingAgendaGeneratorInput): Promise<MeetingAgendaDraftBody> {
    this.inputs.push(input);
    return this.result;
  }
}
