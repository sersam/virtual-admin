import type {
  ChatAgent,
  CommunityNoticeAudience,
  CommunityNoticeTone,
  CommunityNoticeType,
  IncidentPriority,
  IncidentType,
  MeetingAgendaItemSourceType,
} from '@admin/contracts';
import type { CommunityDocument } from '../../domain/document/CommunityDocument.js';

export const evaluationCapabilities = [
  'rag',
  'coordinacion',
  'incidencias',
  'comunicados',
  'actas',
  'juntas',
] as const;

export type EvaluationCapability = (typeof evaluationCapabilities)[number];

export interface RagEvaluationCase {
  readonly id: string;
  readonly question: string;
  readonly documents: readonly CommunityDocument[];
  readonly expectedSourceIds: readonly string[];
  readonly expectedCitedSourceIds: readonly string[];
  readonly expectedFacts: readonly string[];
  readonly insufficientEvidence: boolean;
}

export interface CoordinationEvaluationCase {
  readonly id: string;
  readonly message: string;
  readonly expectedAgent: ChatAgent;
}

export interface IncidentEvaluationCase {
  readonly id: string;
  readonly description: string;
  readonly expectedType: IncidentType;
  readonly expectedPriority: IncidentPriority;
  readonly requiredNoticeConcepts: readonly string[];
  readonly forbiddenClaims: readonly string[];
}

export interface NoticeEvaluationCase {
  readonly id: string;
  readonly input: {
    readonly audience: CommunityNoticeAudience;
    readonly subject: string;
    readonly tone: CommunityNoticeTone;
    readonly type: CommunityNoticeType;
  };
  readonly requiredConcepts: readonly string[];
  readonly forbiddenClaims: readonly string[];
}

export interface MinutesEvaluationTask {
  readonly assignee?: string;
  readonly description: string;
  readonly dueDate?: string;
}

export interface MinutesEvaluationCase {
  readonly id: string;
  readonly notes: string;
  readonly expectedAgreements: readonly string[];
  readonly expectedTasks: readonly MinutesEvaluationTask[];
  readonly forbiddenClaims: readonly string[];
}

export interface AgendaSeedIncident {
  readonly createdAt: string;
  readonly description: string;
  readonly id: string;
  readonly priority: IncidentPriority;
  readonly status: 'pendiente' | 'resuelta';
  readonly type: IncidentType;
}

export interface AgendaSeedPendingAgreement {
  readonly assignee?: string;
  readonly createdAt: string;
  readonly description: string;
  readonly dueDate?: string;
  readonly id: string;
}

export interface AgendaSeedProposal {
  readonly createdAt: string;
  readonly description: string;
  readonly id: string;
}

export interface AgendaExpectedItem {
  readonly sourceId: string;
  readonly sourceType: MeetingAgendaItemSourceType;
}

export interface AgendaEvaluationCase {
  readonly id: string;
  readonly meetingId: string;
  readonly seed: {
    readonly incidents: readonly AgendaSeedIncident[];
    readonly pendingAgreements: readonly AgendaSeedPendingAgreement[];
    readonly proposals: readonly AgendaSeedProposal[];
  };
  readonly expectedItems: readonly AgendaExpectedItem[];
  readonly expectedBodyConcepts: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly emptyExpected: boolean;
}

export interface EvaluationDatasets {
  readonly actas: readonly MinutesEvaluationCase[];
  readonly comunicados: readonly NoticeEvaluationCase[];
  readonly coordinacion: readonly CoordinationEvaluationCase[];
  readonly incidencias: readonly IncidentEvaluationCase[];
  readonly juntas: readonly AgendaEvaluationCase[];
  readonly rag: readonly RagEvaluationCase[];
}
