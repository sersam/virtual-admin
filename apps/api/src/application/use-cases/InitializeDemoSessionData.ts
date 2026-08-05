import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';
import type { PendingAgreement } from '../../domain/meetingAgenda/PendingAgreement.js';
import type { Clock } from '../ports/Clock.js';
import type { IncidentRepository } from '../ports/IncidentRepository.js';
import type { PendingAgreementRepository } from '../ports/PendingAgreementRepository.js';

interface InitializeDemoSessionDataDependencies {
  readonly clock?: Clock;
  readonly incidentRepository: IncidentRepository;
  readonly pendingAgreementRepository: PendingAgreementRepository;
}

export class InitializeDemoSessionData {
  constructor(private readonly dependencies: InitializeDemoSessionDataDependencies) {}

  async execute(sessionId: string): Promise<void> {
    const now = this.dependencies.clock?.now() ?? new Date();

    for (const incident of buildDemoIncidents(sessionId, now)) {
      await this.dependencies.incidentRepository.saveIfAbsent(incident);
    }

    for (const agreement of buildDemoPendingAgreements(sessionId, now)) {
      await this.dependencies.pendingAgreementRepository.saveIfAbsent(agreement);
    }
  }
}

interface DemoIncidentSeed {
  readonly createdDaysAgo: number;
  readonly description: CommunityIncident['description'];
  readonly id: CommunityIncident['id'];
  readonly priority: CommunityIncident['priority'];
  readonly resolvedDaysAgo?: number;
  readonly suggestedResponsible: CommunityIncident['suggestedResponsible'];
  readonly type: CommunityIncident['type'];
}

const demoIncidentSeeds: readonly DemoIncidentSeed[] = [
  {
    id: 'demo-fuga-agua-urgente',
    description: 'Fuga de agua urgente en el garaje junto al cuarto de contadores.',
    type: 'agua',
    priority: 'urgente',
    suggestedResponsible: 'Fontanería',
    createdDaysAgo: 7,
  },
  {
    id: 'demo-averia-ascensor',
    description: 'El ascensor del portal B se queda detenido entre plantas.',
    type: 'ascensor',
    priority: 'alta',
    suggestedResponsible: 'Mantenimiento de ascensores',
    createdDaysAgo: 20,
  },
  {
    id: 'demo-basura-portal',
    description: 'Hay bolsas de basura acumuladas en la entrada del portal A.',
    type: 'limpieza',
    priority: 'media',
    suggestedResponsible: 'Servicio de limpieza',
    createdDaysAgo: 95,
  },
  {
    id: 'demo-fuga-resuelta-reciente',
    description: 'Fuga de agua en el cuarto de bombas reparada esta semana.',
    type: 'agua',
    priority: 'media',
    suggestedResponsible: 'Fontanería',
    createdDaysAgo: 14,
    resolvedDaysAgo: 10,
  },
  {
    id: 'demo-ascensor-resuelto-ordinaria',
    description: 'Avería del ascensor del portal A resuelta tras sustituir el sensor de puertas.',
    type: 'ascensor',
    priority: 'alta',
    suggestedResponsible: 'Mantenimiento de ascensores',
    createdDaysAgo: 50,
    resolvedDaysAgo: 45,
  },
  {
    id: 'demo-luz-resuelta-antigua',
    description: 'Sustitución de luminarias del trastero cerrada antes del período revisado.',
    type: 'electricidad',
    priority: 'baja',
    suggestedResponsible: 'Electricista',
    createdDaysAgo: 130,
    resolvedDaysAgo: 120,
  },
];

function buildDemoIncidents(sessionId: string, now: Date): CommunityIncident[] {
  return demoIncidentSeeds.map((seed) => createDemoIncident(sessionId, seed, now));
}

interface DemoPendingAgreementSeed {
  readonly assignee?: string;
  readonly createdDaysAgo: number;
  readonly description: PendingAgreement['description'];
  readonly dueOnDaysAgo?: number;
  readonly id: PendingAgreement['id'];
}

const demoPendingAgreementSeeds: readonly DemoPendingAgreementSeed[] = [
  {
    id: 'demo-acuerdo-ascensor',
    description:
      'Comparar presupuestos para renovar el cuadro de maniobra del ascensor del portal B.',
    assignee: 'Administrador',
    dueOnDaysAgo: 14,
    createdDaysAgo: 20,
  },
  {
    id: 'demo-acuerdo-placas-solares',
    description: 'Revisar subvenciones disponibles para instalar placas solares en zonas comunes.',
    assignee: 'Administrador',
    dueOnDaysAgo: 45,
    createdDaysAgo: 50,
  },
  {
    id: 'demo-acuerdo-limpieza',
    description: 'Confirmar refuerzo de limpieza de portales tras las obras.',
    assignee: 'Administrador',
    createdDaysAgo: 18,
  },
  {
    id: 'demo-acuerdo-antiguo',
    description: 'Revisar presupuesto antiguo de pintura exterior pendiente desde primavera.',
    assignee: 'Administrador',
    createdDaysAgo: 100,
  },
];

function buildDemoPendingAgreements(sessionId: string, now: Date): PendingAgreement[] {
  return demoPendingAgreementSeeds.map((seed) => createDemoPendingAgreement(sessionId, seed, now));
}

function createDemoIncident(
  sessionId: string,
  seed: DemoIncidentSeed,
  now: Date,
): CommunityIncident {
  const base = {
    id: seed.id,
    sessionId,
    description: seed.description,
    type: seed.type,
    priority: seed.priority,
    suggestedResponsible: seed.suggestedResponsible,
    suggestedNotice: createSuggestedNotice(seed.description),
    createdAt: subtractDays(now, seed.createdDaysAgo),
  };

  return seed.resolvedDaysAgo === undefined
    ? { ...base, status: 'pendiente', resolvedAt: null }
    : { ...base, status: 'resuelta', resolvedAt: subtractDays(now, seed.resolvedDaysAgo) };
}

function createDemoPendingAgreement(
  sessionId: string,
  seed: DemoPendingAgreementSeed,
  now: Date,
): PendingAgreement {
  const dueOnDate =
    seed.dueOnDaysAgo !== undefined ? subtractDays(now, seed.dueOnDaysAgo) : undefined;

  return {
    id: seed.id,
    sessionId,
    description: seed.description,
    ...(seed.assignee ? { assignee: seed.assignee } : {}),
    ...(dueOnDate
      ? { dueDate: formatDisplayDate(dueOnDate), dueOn: formatIsoDate(dueOnDate) }
      : {}),
    createdAt: subtractDays(now, seed.createdDaysAgo),
  };
}

function subtractDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - days);

  return copy;
}

function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
    year: 'numeric',
  }).format(date);
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
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
