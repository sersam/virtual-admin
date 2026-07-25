import { z } from 'zod';
import { IncidentPrioritySchema, IncidentTypeSchema } from '@admin/contracts';
import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type {
  IncidentClassificationResult,
  IncidentClassifier,
} from '../../application/ports/IncidentClassifier.js';
import { executeOpenAiStructuredOperation } from './executeOpenAiStructuredOperation.js';
import { incidentClassificationPrompt } from './versionedPrompts.js';
import type { OpenAiResponsesClient } from './OpenAiResponsesClient.js';

const IncidentClassificationOutputSchema = z.object({
  priority: IncidentPrioritySchema,
  suggestedNotice: z.string().trim().min(1).max(2_000),
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
    const classification = await executeOpenAiStructuredOperation(this.dependencies, {
      errorMessage: 'No se pudo clasificar la incidencia con OpenAI.',
      input: description,
      instructions: incidentClassificationPrompt.instructions,
      maxOutputTokens: 250,
      operation: 'incident-classification',
      promptVersion: incidentClassificationPrompt.version,
      schema: IncidentClassificationOutputSchema,
      schemaName: 'incident_classification_v2',
    });

    return { classification, mode: 'openai' };
  }
}
