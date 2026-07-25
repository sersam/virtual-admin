import { z } from 'zod';
import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type {
  CommunityNoticeDraftResult,
  CommunityNoticeGenerator,
} from '../../application/ports/CommunityNoticeGenerator.js';
import type { CommunityNoticeDraftInput } from '../../domain/communication/CommunityNoticeDraft.js';
import { executeOpenAiStructuredOperation } from './executeOpenAiStructuredOperation.js';
import { communityNoticePrompt } from './versionedPrompts.js';
import type { OpenAiResponsesClient } from './OpenAiResponsesClient.js';

interface OpenAiCommunityNoticeGeneratorDependencies {
  readonly nowMs?: () => number;
  readonly responses: OpenAiResponsesClient;
  readonly telemetry: AiTelemetryReporter;
}

export class OpenAiCommunityNoticeGenerator implements CommunityNoticeGenerator {
  private readonly nowMs: () => number;

  constructor(private readonly dependencies: OpenAiCommunityNoticeGeneratorDependencies) {
    this.nowMs = dependencies.nowMs ?? Date.now;
  }

  async draft(input: CommunityNoticeDraftInput): Promise<CommunityNoticeDraftResult> {
    const output = await executeOpenAiStructuredOperation(this.dependencies, {
      errorMessage: 'No se pudo generar el comunicado con OpenAI.',
      input: JSON.stringify(input),
      instructions: communityNoticePrompt.instructions,
      maxOutputTokens: 700,
      operation: 'community-notice',
      promptVersion: communityNoticePrompt.version,
      schema: CommunityNoticeBodySchema,
      schemaName: 'community_notice_body_v2',
    });

    return { draft: { subject: input.subject, body: output.body }, mode: 'openai' };
  }
}

const CommunityNoticeBodySchema = z.object({
  body: z.string().trim().min(1).max(2_000),
});
