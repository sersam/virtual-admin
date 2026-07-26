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
      await this.dependencies.incidentRepository.saveIfAbsent(incident);
    }

    for (const agreement of buildDemoPendingAgreements(sessionId)) {
      await this.dependencies.pendingAgreementRepository.saveIfAbsent(agreement);
    }
  }
}

type DemoIncidentSeed = readonly [
  id: CommunityIncident['id'],
  description: CommunityIncident['description'],
  type: CommunityIncident['type'],
  priority: CommunityIncident['priority'],
  suggestedResponsible: CommunityIncident['suggestedResponsible'],
  createdAt: string,
];

const demoIncidentSeeds: readonly DemoIncidentSeed[] = [
  [
    'demo-fuga-agua-urgente',
    'Fuga de agua urgente en el garaje junto al cuarto de contadores.',
    'agua',
    'urgente',
    'Fontanería',
    '2026-07-18T08:15:00.000Z',
  ],
  [
    'demo-averia-ascensor',
    'El ascensor del portal B se queda detenido entre plantas.',
    'ascensor',
    'alta',
    'Mantenimiento de ascensores',
    '2026-07-19T10:30:00.000Z',
  ],
  [
    'demo-basura-portal',
    'Hay bolsas de basura acumuladas en la entrada del portal A.',
    'limpieza',
    'media',
    'Servicio de limpieza',
    '2026-07-20T17:45:00.000Z',
  ],
  [
    'demo-ruidos-descanso',
    'Se escuchan ruidos en terrazas fuera del horario permitido.',
    'convivencia',
    'media',
    'Administrador',
    '2026-07-21T22:20:00.000Z',
  ],
];

function buildDemoIncidents(sessionId: string): CommunityIncident[] {
  return demoIncidentSeeds.map((seed) => createDemoIncident(sessionId, seed));
}

type DemoPendingAgreementSeed = readonly [
  id: PendingAgreement['id'],
  description: PendingAgreement['description'],
  assignee: PendingAgreement['assignee'],
  dueDate: PendingAgreement['dueDate'],
  createdAt: string,
];

const demoPendingAgreementSeeds: readonly DemoPendingAgreementSeed[] = [
  [
    'demo-acuerdo-ascensor',
    'Comparar presupuestos para renovar el cuadro de maniobra del ascensor del portal B.',
    'Administrador',
    '15 de septiembre de 2026',
    '2026-07-22T09:00:00.000Z',
  ],
  [
    'demo-acuerdo-placas-solares',
    'Revisar subvenciones disponibles para instalar placas solares en zonas comunes.',
    'Administrador',
    '30 de septiembre de 2026',
    '2026-07-22T09:05:00.000Z',
  ],
];

function buildDemoPendingAgreements(sessionId: string): PendingAgreement[] {
  return demoPendingAgreementSeeds.map((seed) => createDemoPendingAgreement(sessionId, seed));
}

function createDemoIncident(sessionId: string, seed: DemoIncidentSeed): CommunityIncident {
  const [id, description, type, priority, suggestedResponsible, createdAt] = seed;

  return {
    id,
    sessionId,
    description,
    type,
    priority,
    suggestedResponsible,
    suggestedNotice: createSuggestedNotice(description),
    createdAt: new Date(createdAt),
    status: 'pendiente',
    resolvedAt: null,
  };
}

function createDemoPendingAgreement(
  sessionId: string,
  seed: DemoPendingAgreementSeed,
): PendingAgreement {
  const [id, description, assignee, dueDate, createdAt] = seed;

  return {
    id,
    sessionId,
    description,
    ...(assignee ? { assignee } : {}),
    ...(dueDate ? { dueDate } : {}),
    createdAt: new Date(createdAt),
  };
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
