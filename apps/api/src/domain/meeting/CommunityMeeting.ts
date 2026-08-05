export type CommunityMeetingKind = 'ordinaria' | 'extraordinaria';

export interface MeetingReviewPeriod {
  readonly startsAt: Date;
  readonly endsAt: Date;
}

export interface CommunityMeeting {
  readonly id: string;
  readonly kind: CommunityMeetingKind;
  readonly reviewPeriod: MeetingReviewPeriod;
  readonly scheduledAt: Date;
  readonly sessionId: string;
  readonly title: string;
}
