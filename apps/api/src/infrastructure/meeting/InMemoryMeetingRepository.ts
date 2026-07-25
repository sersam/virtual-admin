import type { MeetingRepository } from '../../application/ports/MeetingRepository.js';
import type { CommunityMeeting } from '../../domain/meeting/CommunityMeeting.js';

const demoMeetingTemplates = [
  {
    id: 'meeting-ordinary-2026-09-18',
    kind: 'ordinaria',
    title: 'Junta ordinaria',
    scheduledAt: new Date('2026-09-18T17:00:00.000Z'),
  },
  {
    id: 'meeting-extraordinary-2026-10-15',
    kind: 'extraordinaria',
    title: 'Junta extraordinaria',
    scheduledAt: new Date('2026-10-15T17:00:00.000Z'),
  },
] satisfies readonly Omit<CommunityMeeting, 'sessionId'>[];

export class InMemoryMeetingRepository implements MeetingRepository {
  async listBySession(sessionId: string): Promise<CommunityMeeting[]> {
    return demoMeetingTemplates.map((meeting) => ({ ...meeting, sessionId }));
  }

  async findBySession(sessionId: string, meetingId: string): Promise<CommunityMeeting | undefined> {
    return (await this.listBySession(sessionId)).find((meeting) => meeting.id === meetingId);
  }
}
