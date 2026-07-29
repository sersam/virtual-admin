import type { MeetingRepository } from '../../application/ports/MeetingRepository.js';
import type { CommunityMeeting } from '../../domain/meeting/CommunityMeeting.js';

const demoMeetingTemplates = [
  {
    id: 'meeting-ordinary-2026-09-18',
    kind: 'ordinaria',
    title: 'Junta ordinaria',
    monthOffset: 1,
  },
  {
    id: 'meeting-extraordinary-2026-10-15',
    kind: 'extraordinaria',
    title: 'Junta extraordinaria',
    monthOffset: 2,
  },
] satisfies ReadonlyArray<
  Omit<CommunityMeeting, 'scheduledAt' | 'sessionId'> & { readonly monthOffset: number }
>;

interface InMemoryMeetingRepositoryOptions {
  readonly now?: () => Date;
}

export class InMemoryMeetingRepository implements MeetingRepository {
  private readonly now: () => Date;

  constructor(options: InMemoryMeetingRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async listBySession(sessionId: string): Promise<CommunityMeeting[]> {
    const today = this.now();

    return demoMeetingTemplates.map(({ monthOffset, ...meeting }) => ({
      ...meeting,
      scheduledAt: buildFutureMeetingDate(today, monthOffset),
      sessionId,
    }));
  }

  async findBySession(sessionId: string, meetingId: string): Promise<CommunityMeeting | undefined> {
    return (await this.listBySession(sessionId)).find((meeting) => meeting.id === meetingId);
  }
}

function buildFutureMeetingDate(currentDate: Date, monthOffset: number): Date {
  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth() + monthOffset;
  const day = Math.min(currentDate.getUTCDate(), getDaysInUtcMonth(year, month));

  return new Date(Date.UTC(year, month, day, 17, 0, 0, 0));
}

function getDaysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
