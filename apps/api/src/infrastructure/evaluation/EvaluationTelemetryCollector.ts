import type {
  AiTelemetryEvent,
  AiTelemetryReporter,
} from '../../application/ports/AiTelemetryReporter.js';
import type {
  EvaluationMode,
  EvaluationTelemetrySummary,
} from '../../application/evaluation/EvaluationRunner.js';

export class EvaluationTelemetryCollector implements AiTelemetryReporter {
  private readonly events: EvaluationTelemetrySummary[] = [];

  constructor(private readonly mode: EvaluationMode) {}

  async record(event: AiTelemetryEvent): Promise<void> {
    this.events.push({
      cachedInputTokens: event.cachedInputTokens,
      estimatedCostUsd: event.estimatedCostUsd,
      inputTokens: event.inputTokens,
      latencyMs: event.latencyMs,
      model: event.model,
      operation: event.operation,
      outputTokens: event.outputTokens,
      promptVersion: event.promptVersion,
      result: event.result,
    });
  }

  snapshot(): readonly EvaluationTelemetrySummary[] {
    return this.mode === 'openai' ? [...this.events] : [];
  }
}
