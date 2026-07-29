import { createMeetingMinutesDraft } from '../../domain/meetingMinutes/MeetingMinutesDraft.js';
import type { MeetingMinutesDraftResult } from '../ports/MeetingMinutesGenerator.js';

export function createDeterministicMeetingMinutesDraftResult(
  notes: string,
): MeetingMinutesDraftResult {
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
