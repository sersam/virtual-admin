import { CommunityNoticeDraftSchema, type CommunityNoticeDraftResponse } from '@admin/contracts';
import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type { CommunityNoticeGenerator } from '../../application/ports/CommunityNoticeGenerator.js';
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

  async draft(message: string): Promise<CommunityNoticeDraftResponse> {
    const draft = await executeOpenAiStructuredOperation(this.dependencies, {
      errorMessage: 'No se pudo generar el comunicado con OpenAI.',
      input: message,
      instructions: communityNoticePrompt.instructions,
      maxOutputTokens: 700,
      operation: 'community-notice',
      promptVersion: communityNoticePrompt.version,
      schema: CommunityNoticeDraftSchema,
      schemaName: 'community_notice_v1',
    });

    return { draft, mode: 'openai' };
  }
}
