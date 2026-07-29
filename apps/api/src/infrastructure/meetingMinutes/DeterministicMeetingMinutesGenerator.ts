import { createDeterministicMeetingMinutesDraftResult } from '../../application/meetingMinutes/createDeterministicMeetingMinutesDraftResult.js';
import type {
  MeetingMinutesDraftResult,
  MeetingMinutesGenerator,
} from '../../application/ports/MeetingMinutesGenerator.js';

export class DeterministicMeetingMinutesGenerator implements MeetingMinutesGenerator {
  async draft(notes: string): Promise<MeetingMinutesDraftResult> {
    return createDeterministicMeetingMinutesDraftResult(notes);
  }
}
