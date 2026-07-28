import { createMeetingMinutesDraft } from '../../domain/meetingMinutes/MeetingMinutesDraft.js';
import type {
  MeetingMinutesDraftResult,
  MeetingMinutesGenerator,
} from '../../application/ports/MeetingMinutesGenerator.js';

export class DeterministicMeetingMinutesGenerator implements MeetingMinutesGenerator {
  async draft(notes: string): Promise<MeetingMinutesDraftResult> {
    const draft = createMeetingMinutesDraft(notes);

    return {
      draft: {
        ...draft,
        agreements: [...draft.agreements],
        tasks: draft.tasks.map((task) => ({ ...task })),
      },
      mode: 'deterministic-demo',
    };
  }
}
