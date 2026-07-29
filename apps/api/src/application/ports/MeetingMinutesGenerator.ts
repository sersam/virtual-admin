import type { MeetingMinutesDraftResponse } from '@admin/contracts';

export type MeetingMinutesDraftResult = MeetingMinutesDraftResponse;

export interface MeetingMinutesGenerator {
  draft(notes: string): Promise<MeetingMinutesDraftResult>;
}
