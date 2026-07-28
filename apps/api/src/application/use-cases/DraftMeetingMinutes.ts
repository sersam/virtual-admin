import type { MeetingMinutesDraftResponse } from '@admin/contracts';
import type { PendingAgreement } from '../../domain/meetingAgenda/PendingAgreement.js';
import { createMeetingMinutesDraft } from '../../domain/meetingMinutes/MeetingMinutesDraft.js';
import type { Clock } from '../ports/Clock.js';
import type { IdGenerator } from '../ports/IdGenerator.js';
import type { MeetingMinutesGenerator } from '../ports/MeetingMinutesGenerator.js';
import type { PendingAgreementRepository } from '../ports/PendingAgreementRepository.js';

interface DraftMeetingMinutesDependencies {
  readonly clock?: Clock;
  readonly generator?: MeetingMinutesGenerator;
  readonly ids?: IdGenerator;
  readonly pendingAgreementRepository?: PendingAgreementRepository;
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
    const result = await (this.dependencies?.generator ?? deterministicGenerator).draft(notes);

    if (
      this.dependencies?.clock &&
      this.dependencies.ids &&
      this.dependencies.pendingAgreementRepository &&
      options.sessionId
    ) {
      for (const task of result.draft.tasks) {
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
        ...result.draft,
        agreements: [...result.draft.agreements],
        tasks: result.draft.tasks.map((task) => ({ ...task })),
      },
      mode: result.mode,
    };
  }
}

const deterministicGenerator: MeetingMinutesGenerator = {
  async draft(notes: string): Promise<MeetingMinutesDraftResponse> {
    const draft = createMeetingMinutesDraft(notes);

    return {
      draft: {
        ...draft,
        agreements: [...draft.agreements],
        tasks: draft.tasks.map((task) => ({ ...task })),
      },
      mode: 'deterministic-demo',
    };
  },
};

function presentOptionalPendingAgreementDetails(
  task: Pick<PendingAgreement, 'assignee' | 'dueDate'>,
): {
  readonly assignee?: string;
  readonly dueDate?: string;
} {
  return {
    ...(task.assignee ? { assignee: task.assignee } : {}),
    ...(task.dueDate ? { dueDate: task.dueDate } : {}),
  };
}
