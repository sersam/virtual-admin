import type { MeetingAgendaItem } from '@admin/contracts';
import { z } from 'zod';
import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type {
  MeetingAgendaDraftBody,
  MeetingAgendaGenerator,
  MeetingAgendaGeneratorInput,
} from '../../application/ports/MeetingAgendaGenerator.js';
import { executeOpenAiStructuredOperation } from './executeOpenAiStructuredOperation.js';
import type { OpenAiResponsesClient } from './OpenAiResponsesClient.js';
import { meetingAgendaPrompt } from './versionedPrompts.js';

interface OpenAiMeetingAgendaGeneratorDependencies {
  readonly nowMs?: () => number;
  readonly responses: OpenAiResponsesClient;
  readonly telemetry: AiTelemetryReporter;
}

export class OpenAiMeetingAgendaGenerator implements MeetingAgendaGenerator {
  constructor(private readonly dependencies: OpenAiMeetingAgendaGeneratorDependencies) {}

  async draft(input: MeetingAgendaGeneratorInput): Promise<MeetingAgendaDraftBody> {
    const output = await executeOpenAiStructuredOperation(this.dependencies, {
      errorMessage: 'No se pudo generar el orden del día con OpenAI.',
      input: JSON.stringify(presentOpenAiInput(input)),
      instructions: meetingAgendaPrompt.instructions,
      maxOutputTokens: 1_500,
      operation: 'meeting-agenda',
      promptVersion: meetingAgendaPrompt.version,
      schema: MeetingAgendaDraftOutputSchema,
      schemaName: 'meeting_agenda_draft_v2',
    });

    return { body: output.body, mode: 'openai' };
  }
}

const MeetingAgendaDraftOutputSchema = z.object({
  body: z.string().trim().min(1).max(4_000),
});

function presentOpenAiInput(input: MeetingAgendaGeneratorInput): {
  readonly items: readonly MeetingAgendaItem[];
  readonly meeting: {
    readonly id: string;
    readonly kind: string;
    readonly reviewPeriod: {
      readonly startsAt: string;
      readonly endsAt: string;
    };
    readonly scheduledAt: string;
    readonly title: string;
  };
} {
  return {
    meeting: {
      id: input.meeting.id,
      kind: input.meeting.kind,
      reviewPeriod: {
        startsAt: input.meeting.reviewPeriod.startsAt.toISOString(),
        endsAt: input.meeting.reviewPeriod.endsAt.toISOString(),
      },
      scheduledAt: input.meeting.scheduledAt.toISOString(),
      title: input.meeting.title,
    },
    items: input.items,
  };
}
