export type AiOperation =
  | 'chat-intent-classification'
  | 'community-notice'
  | 'document-answer'
  | 'document-embedding'
  | 'incident-classification'
  | 'meeting-minutes';
export type AiTelemetryResult = 'success' | 'failure';

export interface AiTelemetryEvent {
  readonly cachedInputTokens: number;
  readonly estimatedCostUsd: number;
  readonly inputTokens: number;
  readonly latencyMs: number;
  readonly model: string;
  readonly operation: AiOperation;
  readonly outputTokens: number;
  readonly promptVersion: string;
  readonly result: AiTelemetryResult;
}

export interface AiTelemetryReporter {
  record(event: AiTelemetryEvent): Promise<void>;
}
