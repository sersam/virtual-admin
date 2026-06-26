import { createMeetingMinutesDraft } from '@admin/meeting-minutes';

import {
  MeetingMinutesDraftRequestSchema,
  type MeetingMinutesDraftResponse,
} from '@admin/contracts';

export function createLocalMeetingMinutesDraft(notes: string): MeetingMinutesDraftResponse {
  const payload = MeetingMinutesDraftRequestSchema.parse({ notes });
  const draft = createMeetingMinutesDraft(payload.notes);

  return {
    draft: {
      ...draft,
      tasks: draft.tasks.map((task) => ({ ...task })),
    },
    mode: 'deterministic-demo',
  };
}
