import type { ObservabilityResponse } from '@admin/contracts';
import type { AiTelemetryEvent, AiTelemetryProvider } from './AiTelemetryReporter.js';

export interface PersistedAiTelemetryEvent extends AiTelemetryEvent {
  readonly occurredAt: Date;
  readonly provider: AiTelemetryProvider;
}

export interface AiTelemetrySummaryInput {
  readonly day: string;
  readonly generatedAt: Date;
  readonly ipLimit: number;
  readonly sessionLimit: number;
}

export interface AiTelemetryEventRepository {
  record(event: PersistedAiTelemetryEvent): Promise<void>;
  summarizeDay(input: AiTelemetrySummaryInput): Promise<ObservabilityResponse>;
}
