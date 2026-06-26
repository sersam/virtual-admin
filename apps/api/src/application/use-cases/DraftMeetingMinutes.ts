import type { MeetingMinutesDraftResponse } from '@admin/contracts';
import { createMeetingMinutesDraft } from '../../domain/meetingMinutes/MeetingMinutesDraft.js';

export class DraftMeetingMinutes {
  async execute(notes: string): Promise<MeetingMinutesDraftResponse> {
    const draft = createMeetingMinutesDraft(notes);

    return {
      draft: {
        ...draft,
        tasks: draft.tasks.map((task) => ({ ...task })),
      },
      mode: 'deterministic-demo',
    };
  }
}
