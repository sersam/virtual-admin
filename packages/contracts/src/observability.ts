import { z } from 'zod';
export const AiTelemetryResultSchema = z.enum(['success', 'failure']);
export const AiTelemetryProviderSchema = z.enum(['openai', 'deterministic-demo']);

export const ObservabilityMetricSummarySchema = z.object({
  averageLatencyMs: z.number().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
  executions: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  fallbacks: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  successes: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

export const ObservabilityBreakdownByOperationSchema = ObservabilityMetricSummarySchema.extend({
  operation: z.string().min(1),
});

export const ObservabilityBreakdownByModelSchema = ObservabilityMetricSummarySchema.extend({
  model: z.string().min(1),
  provider: AiTelemetryProviderSchema,
});

export const ObservabilityResponseSchema = z.object({
  generatedAt: z.iso.datetime(),
  limits: z.object({
    aiActionsPerIpPerDay: z.number().int().positive(),
    aiActionsPerSessionPerDay: z.number().int().positive(),
  }),
  period: z.object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endsAt: z.iso.datetime(),
    startsAt: z.iso.datetime(),
    timezone: z.literal('UTC'),
  }),
  summary: ObservabilityMetricSummarySchema,
  byModel: z.array(ObservabilityBreakdownByModelSchema),
  byOperation: z.array(ObservabilityBreakdownByOperationSchema),
});

export type AiTelemetryProvider = z.infer<typeof AiTelemetryProviderSchema>;
export type AiTelemetryResult = z.infer<typeof AiTelemetryResultSchema>;
export type ObservabilityMetricSummary = z.infer<typeof ObservabilityMetricSummarySchema>;
export type ObservabilityResponse = z.infer<typeof ObservabilityResponseSchema>;
