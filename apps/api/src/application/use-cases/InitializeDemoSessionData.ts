import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';
import type { PendingAgreement } from '../../domain/meetingAgenda/PendingAgreement.js';
import type { IncidentRepository } from '../ports/IncidentRepository.js';
import type { PendingAgreementRepository } from '../ports/PendingAgreementRepository.js';

interface InitializeDemoSessionDataDependencies {
  readonly incidentRepository: IncidentRepository;
  readonly pendingAgreementRepository: PendingAgreementRepository;
}

export class InitializeDemoSessionData {
  constructor(private readonly dependencies: InitializeDemoSessionDataDependencies) {}

  async execute(sessionId: string): Promise<void> {
    for (const incident of buildDemoIncidents(sessionId)) {
      await this.dependencies.incidentRepository.save(incident);
    }

    for (const agreement of buildDemoPendingAgreements(sessionId)) {
      await this.dependencies.pendingAgreementRepository.save(agreement);
    }
  }
}

function buildDemoIncidents(sessionId: string): CommunityIncident[] {
  return [
    {
      id: 'demo-fuga-agua-urgente',
      sessionId,
      description: 'Fuga de agua urgente en el garaje junto al cuarto de contadores.',
      type: 'agua',
      priority: 'urgente',
      suggestedResponsible: 'Fontanería',
      suggestedNotice: createSuggestedNotice(
        'Fuga de agua urgente en el garaje junto al cuarto de contadores.',
      ),
      createdAt: new Date('2026-07-18T08:15:00.000Z'),
      status: 'pendiente',
      resolvedAt: null,
    },
    {
      id: 'demo-averia-ascensor',
      sessionId,
      description: 'El ascensor del portal B se queda detenido entre plantas.',
      type: 'ascensor',
      priority: 'alta',
      suggestedResponsible: 'Mantenimiento de ascensores',
      suggestedNotice: createSuggestedNotice(
        'El ascensor del portal B se queda detenido entre plantas.',
      ),
      createdAt: new Date('2026-07-19T10:30:00.000Z'),
      status: 'pendiente',
      resolvedAt: null,
    },
    {
      id: 'demo-basura-portal',
      sessionId,
      description: 'Hay bolsas de basura acumuladas en la entrada del portal A.',
      type: 'limpieza',
      priority: 'media',
      suggestedResponsible: 'Servicio de limpieza',
      suggestedNotice: createSuggestedNotice(
        'Hay bolsas de basura acumuladas en la entrada del portal A.',
      ),
      createdAt: new Date('2026-07-20T17:45:00.000Z'),
      status: 'pendiente',
      resolvedAt: null,
    },
    {
      id: 'demo-ruidos-descanso',
      sessionId,
      description: 'Se escuchan ruidos en terrazas fuera del horario permitido.',
      type: 'convivencia',
      priority: 'media',
      suggestedResponsible: 'Administrador',
      suggestedNotice: createSuggestedNotice(
        'Se escuchan ruidos en terrazas fuera del horario permitido.',
      ),
      createdAt: new Date('2026-07-21T22:20:00.000Z'),
      status: 'pendiente',
      resolvedAt: null,
    },
  ];
}

function buildDemoPendingAgreements(sessionId: string): PendingAgreement[] {
  return [
    {
      id: 'demo-acuerdo-ascensor',
      sessionId,
      description:
        'Comparar presupuestos para renovar el cuadro de maniobra del ascensor del portal B.',
      assignee: 'Administrador',
      dueDate: '15 de septiembre de 2026',
      createdAt: new Date('2026-07-22T09:00:00.000Z'),
    },
    {
      id: 'demo-acuerdo-placas-solares',
      sessionId,
      description:
        'Revisar subvenciones disponibles para instalar placas solares en zonas comunes.',
      assignee: 'Administrador',
      dueDate: '30 de septiembre de 2026',
      createdAt: new Date('2026-07-22T09:05:00.000Z'),
    },
  ];
}

function createSuggestedNotice(description: string): string {
  return [
    'Estimados vecinos:',
    '',
    `Se ha registrado la siguiente incidencia: ${description}`,
    '',
    'La administración comunicará cualquier novedad relevante.',
  ].join('\n');
}
