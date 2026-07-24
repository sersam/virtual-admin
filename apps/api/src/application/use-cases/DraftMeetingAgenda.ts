import type {
  IncidentPriority,
  MeetingAgendaDraftResponse,
  MeetingAgendaItem,
} from '@admin/contracts';
import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';
import type { PendingAgreement } from '../../domain/meetingAgenda/PendingAgreement.js';
import type { IncidentRepository } from '../ports/IncidentRepository.js';
import type { PendingAgreementRepository } from '../ports/PendingAgreementRepository.js';

interface DraftMeetingAgendaDependencies {
  readonly incidentRepository: IncidentRepository;
  readonly pendingAgreementRepository: PendingAgreementRepository;
}

interface DraftMeetingAgendaInput {
  readonly sessionId: string;
}

interface PrioritizedAgendaItem extends MeetingAgendaItem {
  readonly createdAt: Date;
}

const TITLE = 'Orden del día';
const EMPTY_BODY = 'No hay asuntos pendientes para incluir en el orden del día.';
const MAX_AGENDA_ITEMS = 100;
const PRIORITY_WEIGHT: Record<IncidentPriority, number> = {
  urgente: 4,
  alta: 3,
  media: 2,
  baja: 1,
};

export class DraftMeetingAgenda {
  constructor(private readonly dependencies: DraftMeetingAgendaDependencies) {}

  async execute(input: DraftMeetingAgendaInput): Promise<MeetingAgendaDraftResponse> {
    const [incidents, pendingAgreements] = await Promise.all([
      this.dependencies.incidentRepository.listBySession(input.sessionId),
      this.dependencies.pendingAgreementRepository.listBySession(input.sessionId),
    ]);
    const items = [
      ...incidents.filter((incident) => incident.status === 'pendiente').map(presentIncidentItem),
      ...pendingAgreements.map(presentPendingAgreementItem),
    ]
      .sort(compareAgendaItems)
      .slice(0, MAX_AGENDA_ITEMS);

    return {
      draft: {
        title: TITLE,
        body: items.length > 0 ? buildBody(items) : EMPTY_BODY,
        items: items.map(presentTransportItem),
      },
      mode: 'deterministic-demo',
    };
  }
}

function presentIncidentItem(incident: CommunityIncident): PrioritizedAgendaItem {
  return {
    description: incident.description,
    priority: incident.priority,
    sourceType: 'incident',
    sourceId: incident.id,
    createdAt: incident.createdAt,
  };
}

function presentPendingAgreementItem(agreement: PendingAgreement): PrioritizedAgendaItem {
  return {
    description: agreement.description,
    priority: agreement.dueDate ? 'alta' : 'media',
    sourceType: 'pending-agreement',
    sourceId: agreement.id,
    ...(agreement.assignee ? { assignee: agreement.assignee } : {}),
    ...(agreement.dueDate ? { dueDate: agreement.dueDate } : {}),
    createdAt: agreement.createdAt,
  };
}

function compareAgendaItems(first: PrioritizedAgendaItem, second: PrioritizedAgendaItem): number {
  const priorityDiff = PRIORITY_WEIGHT[second.priority] - PRIORITY_WEIGHT[first.priority];
  if (priorityDiff !== 0) return priorityDiff;

  const createdAtDiff = first.createdAt.getTime() - second.createdAt.getTime();
  if (createdAtDiff !== 0) return createdAtDiff;

  const sourceTypeDiff = first.sourceType.localeCompare(second.sourceType);
  if (sourceTypeDiff !== 0) return sourceTypeDiff;

  return first.sourceId.localeCompare(second.sourceId);
}

function presentTransportItem(item: PrioritizedAgendaItem): MeetingAgendaItem {
  return {
    description: item.description,
    priority: item.priority,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    ...(item.assignee ? { assignee: item.assignee } : {}),
    ...(item.dueDate ? { dueDate: item.dueDate } : {}),
  };
}

function buildBody(items: readonly PrioritizedAgendaItem[]): string {
  return [
    TITLE,
    '',
    ...items.flatMap((item, index) => [
      `${index + 1}. [${formatPriority(item.priority)}] ${item.description}`,
      `   ${formatSourceDetails(item)}`,
    ]),
  ].join('\n');
}

function formatPriority(priority: IncidentPriority): string {
  return priority.charAt(0).toLocaleUpperCase('es') + priority.slice(1);
}

function formatSourceDetails(item: PrioritizedAgendaItem): string {
  const sourceName = item.sourceType === 'incident' ? 'incidencia' : 'acuerdo pendiente';
  const details = [`Origen: ${sourceName} ${item.sourceId}.`];
  if (item.assignee) details.push(`Responsable: ${item.assignee}.`);
  if (item.dueDate) details.push(`Fecha: ${item.dueDate}.`);

  return details.join(' ');
}
