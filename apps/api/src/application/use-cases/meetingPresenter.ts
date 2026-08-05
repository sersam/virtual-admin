import type { Meeting } from '@admin/contracts';
import type { CommunityMeeting } from '../../domain/meeting/CommunityMeeting.js';

export function presentMeeting(meeting: CommunityMeeting): Meeting {
  return {
    id: meeting.id,
    kind: meeting.kind,
    title: meeting.title,
    scheduledAt: meeting.scheduledAt.toISOString(),
    reviewPeriod: {
      startsAt: meeting.reviewPeriod.startsAt.toISOString(),
      endsAt: meeting.reviewPeriod.endsAt.toISOString(),
    },
  };
}
