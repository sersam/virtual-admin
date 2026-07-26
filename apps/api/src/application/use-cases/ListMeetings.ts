import type { MeetingListResponse } from '@admin/contracts';
import type { MeetingRepository } from '../ports/MeetingRepository.js';
import { presentMeeting } from './meetingPresenter.js';

interface ListMeetingsDependencies {
  readonly meetingRepository: MeetingRepository;
}

interface ListMeetingsInput {
  readonly sessionId: string;
}

export class ListMeetings {
  constructor(private readonly dependencies: ListMeetingsDependencies) {}

  async execute(input: ListMeetingsInput): Promise<MeetingListResponse> {
    const meetings = await this.dependencies.meetingRepository.listBySession(input.sessionId);

    return {
      meetings: meetings.map(presentMeeting),
    };
  }
}
