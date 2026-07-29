import type {
  IncidentPriority,
  MeetingAgendaDraftResponse,
  MeetingAgendaItem,
} from '@admin/contracts';
import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';
import type { CommunityMeeting } from '../../domain/meeting/CommunityMeeting.js';
import type { PendingAgreement } from '../../domain/meetingAgenda/PendingAgreement.js';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';
import type { IncidentRepository } from '../ports/IncidentRepository.js';
import type { MeetingRepository } from '../ports/MeetingRepository.js';
import type { MeetingAgendaGenerator } from '../ports/MeetingAgendaGenerator.js';
import type { PendingAgreementRepository } from '../ports/PendingAgreementRepository.js';
import type { ProposalRepository } from '../ports/ProposalRepository.js';
import { presentMeeting } from './meetingPresenter.js';

interface DraftMeetingAgendaDependencies {
  readonly incidentRepository: IncidentRepository;
  readonly generator: MeetingAgendaGenerator;
  readonly meetingRepository: MeetingRepository;
  readonly pendingAgreementRepository: PendingAgreementRepository;
  readonly proposalRepository: ProposalRepository;
}

interface DraftMeetingAgendaInput {
  readonly meetingId?: string;
  readonly sessionId: string;
}

type PrioritizedAgendaItem = Extract<
  MeetingAgendaItem,
  { sourceType: 'incident' | 'pending-agreement' }
> & {
  readonly createdAt: Date;
};

type ProposalAgendaItem = Extract<MeetingAgendaItem, { sourceType: 'proposal' }> & {
  readonly createdAt: Date;
};

type AgendaItemWithCreatedAt = PrioritizedAgendaItem | ProposalAgendaItem;

const TITLE = 'Orden del día';
const EMPTY_BODY = 'No hay asuntos pendientes para incluir en el orden del día.';
const MAX_AGENDA_ITEMS = 100;
const PRIORITY_WEIGHT: Record<IncidentPriority, number> = {
  urgente: 4,
  alta: 3,
  media: 2,
  baja: 1,
};

export class MeetingNotFoundError extends Error {
  constructor() {
    super('No se ha encontrado la junta seleccionada.');
  }
}

export class DraftMeetingAgenda {
  constructor(private readonly dependencies: DraftMeetingAgendaDependencies) {}

  async execute(input: DraftMeetingAgendaInput): Promise<MeetingAgendaDraftResponse> {
    const meeting = input.meetingId
      ? await this.dependencies.meetingRepository.findBySession(input.sessionId, input.meetingId)
      : (await this.dependencies.meetingRepository.listBySession(input.sessionId))[0];
    if (!meeting) throw new MeetingNotFoundError();

    const [incidents, pendingAgreements, proposals] = await Promise.all([
      this.dependencies.incidentRepository.listBySession(input.sessionId),
      this.dependencies.pendingAgreementRepository.listBySession(input.sessionId),
      this.dependencies.proposalRepository.listBySession(input.sessionId),
    ]);
    const prioritizedItems = [
      ...incidents.filter((incident) => incident.status === 'pendiente').map(presentIncidentItem),
      ...pendingAgreements.map(presentPendingAgreementItem),
    ].sort(compareAgendaItems);
    const proposalItems = proposals.map(presentProposalItem).sort(compareProposalItems);
    const items = [...prioritizedItems, ...proposalItems]
      .slice(0, MAX_AGENDA_ITEMS)
      .map(presentTransportItem);
    const generatedDraft =
      items.length > 0
        ? await this.dependencies.generator.draft({ meeting, items })
        : { body: EMPTY_BODY, mode: 'deterministic-demo' as const };

    return {
      draft: {
        title: buildTitle(meeting),
        body: generatedDraft.body,
        items,
      },
      meeting: presentMeeting(meeting),
      mode: generatedDraft.mode,
    };
  }
}

function buildTitle(meeting: CommunityMeeting): string {
  return `${TITLE} · ${meeting.title} · ${formatMeetingDate(meeting.scheduledAt)}`;
}

function formatMeetingDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
    year: 'numeric',
  }).format(date);
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

function presentProposalItem(proposal: CommunityProposal): ProposalAgendaItem {
  return {
    description: proposal.description,
    sourceType: 'proposal',
    sourceId: proposal.id,
    createdAt: proposal.createdAt,
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

function compareProposalItems(first: ProposalAgendaItem, second: ProposalAgendaItem): number {
  const createdAtDiff = first.createdAt.getTime() - second.createdAt.getTime();
  if (createdAtDiff !== 0) return createdAtDiff;

  return first.sourceId.localeCompare(second.sourceId);
}

function presentTransportItem(item: AgendaItemWithCreatedAt): MeetingAgendaItem {
  if (item.sourceType === 'proposal') {
    return {
      description: item.description,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
    };
  }

  return item.sourceType === 'pending-agreement'
    ? {
        description: item.description,
        priority: item.priority,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        ...(item.assignee ? { assignee: item.assignee } : {}),
        ...(item.dueDate ? { dueDate: item.dueDate } : {}),
      }
    : {
        description: item.description,
        priority: item.priority,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
      };
}
