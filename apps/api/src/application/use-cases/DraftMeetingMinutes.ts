import type { MeetingMinutesDraftResponse, MeetingMinutesTask } from '@admin/contracts';
import { createMeetingMinutesDraft } from '../../domain/meetingMinutes/MeetingMinutesDraft.js';
import type { Clock } from '../ports/Clock.js';
import type { IdGenerator } from '../ports/IdGenerator.js';
import type { PendingAgreementRepository } from '../ports/PendingAgreementRepository.js';

interface DraftMeetingMinutesDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly pendingAgreementRepository: PendingAgreementRepository;
}

interface DraftMeetingMinutesOptions {
  readonly sessionId?: string;
}

export class DraftMeetingMinutes {
  constructor(private readonly dependencies?: DraftMeetingMinutesDependencies) {}

  async execute(
    notes: string,
    options: DraftMeetingMinutesOptions = {},
  ): Promise<MeetingMinutesDraftResponse> {
    const draft = createMeetingMinutesDraft(notes);

    if (this.dependencies && options.sessionId) {
      for (const task of draft.tasks) {
        await this.dependencies.pendingAgreementRepository.save({
          id: this.dependencies.ids.randomId(),
          sessionId: options.sessionId,
          description: task.description,
          ...presentOptionalPendingAgreementDetails(task),
          createdAt: this.dependencies.clock.now(),
        });
      }
    }

    return {
      draft: {
        ...draft,
        tasks: draft.tasks.map((task) => ({ ...task })),
      },
      mode: 'deterministic-demo',
    };
  }
}

function presentOptionalPendingAgreementDetails(task: MeetingMinutesTask): {
  readonly assignee?: string;
  readonly dueDate?: string;
} {
  return {
    ...(task.assignee ? { assignee: task.assignee } : {}),
    ...(task.dueDate ? { dueDate: task.dueDate } : {}),
  };
}
