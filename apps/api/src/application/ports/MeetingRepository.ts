import type { CommunityMeeting } from '../../domain/meeting/CommunityMeeting.js';

export interface MeetingRepository {
  findBySession(sessionId: string, meetingId: string): Promise<CommunityMeeting | undefined>;
  listBySession(sessionId: string): Promise<CommunityMeeting[]>;
}
