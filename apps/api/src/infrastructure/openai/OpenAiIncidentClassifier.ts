import { z } from 'zod';
import { IncidentPrioritySchema, IncidentTypeSchema } from '@admin/contracts';
import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type {
  IncidentClassificationResult,
  IncidentClassifier,
} from '../../application/ports/IncidentClassifier.js';
import { estimateGpt56LunaCostUsd, GPT_5_6_LUNA_MODEL } from './openAiPricing.js';
import { incidentClassificationPrompt } from './versionedPrompts.js';
import type { OpenAiResponsesClient, OpenAiUsage } from './OpenAiResponsesClient.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';

const IncidentClassificationOutputSchema = z.object({
  priority: IncidentPrioritySchema,
  suggestedResponsible: z.string().trim().min(1).max(120),
  type: IncidentTypeSchema,
});

interface OpenAiIncidentClassifierDependencies {
  readonly nowMs?: () => number;
  readonly responses: OpenAiResponsesClient;
  readonly telemetry: AiTelemetryReporter;
}

export class OpenAiIncidentClassifier implements IncidentClassifier {
  private readonly nowMs: () => number;

  constructor(private readonly dependencies: OpenAiIncidentClassifierDependencies) {
    this.nowMs = dependencies.nowMs ?? Date.now;
  }

  async classify(description: string): Promise<IncidentClassificationResult> {
    const startedAt = this.nowMs();
    let usage = emptyUsage();

    try {
      const response = await this.dependencies.responses.createStructuredResponse({
        input: description,
        instructions: incidentClassificationPrompt.instructions,
        maxOutputTokens: 250,
        model: GPT_5_6_LUNA_MODEL,
        promptVersion: incidentClassificationPrompt.version,
        schema: IncidentClassificationOutputSchema,
        schemaName: 'incident_classification_v1',
      });
      usage = response.usage;
      const classification = IncidentClassificationOutputSchema.parse(response.output);

      await this.recordTelemetry(startedAt, usage, 'success');

      return { classification, mode: 'openai' };
    } catch (error) {
      await this.recordTelemetry(startedAt, usage, 'failure');
      throw error instanceof OpenAiProviderError
        ? error
        : new OpenAiProviderError('No se pudo clasificar la incidencia con OpenAI.');
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
      operation: 'incident-classification',
      outputTokens: usage.outputTokens,
      promptVersion: incidentClassificationPrompt.version,
      result,
    });
  }
}

function emptyUsage(): OpenAiUsage {
  return { cachedInputTokens: 0, inputTokens: 0, outputTokens: 0 };
}
