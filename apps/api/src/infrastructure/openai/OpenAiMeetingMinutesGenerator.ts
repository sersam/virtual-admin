import { z } from 'zod';
import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type {
  MeetingMinutesDraftResult,
  MeetingMinutesGenerator,
} from '../../application/ports/MeetingMinutesGenerator.js';
import { executeOpenAiStructuredOperation } from './executeOpenAiStructuredOperation.js';
import type { OpenAiResponsesClient } from './OpenAiResponsesClient.js';
import { meetingMinutesPrompt } from './versionedPrompts.js';

interface OpenAiMeetingMinutesGeneratorDependencies {
  readonly nowMs?: () => number;
  readonly responses: OpenAiResponsesClient;
  readonly telemetry: AiTelemetryReporter;
}

const TITLE = 'Acta de reunión';

export class OpenAiMeetingMinutesGenerator implements MeetingMinutesGenerator {
  constructor(private readonly dependencies: OpenAiMeetingMinutesGeneratorDependencies) {}

  async draft(notes: string): Promise<MeetingMinutesDraftResult> {
    const output = await executeOpenAiStructuredOperation(this.dependencies, {
      errorMessage: 'No se pudo generar el acta con OpenAI.',
      input: JSON.stringify({ notes }),
      instructions: meetingMinutesPrompt.instructions,
      maxOutputTokens: 1_500,
      operation: 'meeting-minutes',
      promptVersion: meetingMinutesPrompt.version,
      schema: MeetingMinutesDraftOutputSchema,
      schemaName: 'meeting_minutes_draft_v1',
    });

    return {
      draft: {
        title: TITLE,
        body: output.body,
        agreements: output.agreements,
        tasks: output.tasks.map(presentTask),
      },
      mode: 'openai',
    };
  }
}

const MeetingMinutesTaskOutputSchema = z.object({
  description: z.string().trim().min(1).max(240),
  assignee: z.string().trim().min(1).max(120).nullable(),
  dueDate: z.string().trim().min(1).max(80).nullable(),
});

const MeetingMinutesDraftOutputSchema = z.object({
  body: z.string().trim().min(1).max(4_000),
  agreements: z.array(z.string().trim().min(1).max(240)).max(50),
  tasks: z.array(MeetingMinutesTaskOutputSchema).max(50),
});

type MeetingMinutesTaskOutput = z.infer<typeof MeetingMinutesTaskOutputSchema>;

function presentTask(task: MeetingMinutesTaskOutput): {
  readonly assignee?: string;
  readonly description: string;
  readonly dueDate?: string;
} {
  return {
    ...(task.assignee ? { assignee: task.assignee } : {}),
    description: task.description,
    ...(task.dueDate ? { dueDate: task.dueDate } : {}),
  };
}
