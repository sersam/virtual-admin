import type { AiProviderMode, MeetingAgendaItem } from '@admin/contracts';
import type { CommunityMeeting } from '../../domain/meeting/CommunityMeeting.js';

export interface MeetingAgendaGeneratorInput {
  readonly items: readonly MeetingAgendaItem[];
  readonly meeting: CommunityMeeting;
}

export interface MeetingAgendaDraftBody {
  readonly body: string;
  readonly mode: AiProviderMode;
}

export interface MeetingAgendaGenerator {
  draft(input: MeetingAgendaGeneratorInput): Promise<MeetingAgendaDraftBody>;
}
