export type CommunityMeetingKind = 'ordinaria' | 'extraordinaria';

export interface CommunityMeeting {
  readonly id: string;
  readonly kind: CommunityMeetingKind;
  readonly scheduledAt: Date;
  readonly sessionId: string;
  readonly title: string;
}
