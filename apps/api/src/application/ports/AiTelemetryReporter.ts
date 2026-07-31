import type { AiFallbackReason } from '@admin/contracts';

export type AiOperation =
  | 'chat-intent-classification'
  | 'community-notice'
  | 'document-answer'
  | 'document-embedding'
  | 'incident-classification'
  | 'meeting-agenda'
  | 'meeting-minutes';
export type AiTelemetryResult = 'success' | 'failure';
export type AiTelemetryProvider = 'deterministic-demo' | 'openai';

export interface AiTelemetryEvent {
  readonly cachedInputTokens: number;
  readonly estimatedCostUsd: number;
  readonly fallbackReason?: AiFallbackReason;
  readonly inputTokens: number;
  readonly latencyMs: number;
  readonly model: string;
  readonly operation: AiOperation;
  readonly outputTokens: number;
  readonly promptVersion: string;
  readonly provider?: AiTelemetryProvider;
  readonly result: AiTelemetryResult;
}

export interface AiTelemetryReporter {
  record(event: AiTelemetryEvent): Promise<void>;
}
