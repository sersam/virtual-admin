import { CommunityNoticeDraftSchema, type CommunityNoticeDraftResponse } from '@admin/contracts';
import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type { CommunityNoticeGenerator } from '../../application/ports/CommunityNoticeGenerator.js';
import { estimateGpt56LunaCostUsd, GPT_5_6_LUNA_MODEL } from './openAiPricing.js';
import { communityNoticePrompt } from './versionedPrompts.js';
import type { OpenAiResponsesClient, OpenAiUsage } from './OpenAiResponsesClient.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';

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
    const startedAt = this.nowMs();
    let usage = emptyUsage();

    try {
      const response = await this.dependencies.responses.createStructuredResponse({
        input: message,
        instructions: communityNoticePrompt.instructions,
        maxOutputTokens: 700,
        model: GPT_5_6_LUNA_MODEL,
        promptVersion: communityNoticePrompt.version,
        schema: CommunityNoticeDraftSchema,
        schemaName: 'community_notice_v1',
      });
      usage = response.usage;
      const draft = CommunityNoticeDraftSchema.parse(response.output);

      await this.recordTelemetry(startedAt, usage, 'success');

      return { draft, mode: 'openai' };
    } catch (error) {
      await this.recordTelemetry(startedAt, usage, 'failure');
      throw error instanceof OpenAiProviderError
        ? error
        : new OpenAiProviderError('No se pudo generar el comunicado con OpenAI.');
    }
  }

  private async recordTelemetry(
    startedAt: number,
    usage: OpenAiUsage,
    result: 'success' | 'failure',
  ): Promise<void> {
    await this.dependencies.telemetry.record({
      cachedInputTokens: usage.cachedInputTokens,
      estimatedCostUsd: estimateGpt56LunaCostUsd(usage),
      inputTokens: usage.inputTokens,
      latencyMs: this.nowMs() - startedAt,
      model: GPT_5_6_LUNA_MODEL,
      operation: 'community-notice',
      outputTokens: usage.outputTokens,
      promptVersion: communityNoticePrompt.version,
      result,
    });
  }
}

function emptyUsage(): OpenAiUsage {
  return { cachedInputTokens: 0, inputTokens: 0, outputTokens: 0 };
}
