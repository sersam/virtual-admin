import type { z } from 'zod';
import type {
  AiOperation,
  AiTelemetryReporter,
  AiTelemetryResult,
} from '../../application/ports/AiTelemetryReporter.js';
import { estimateOpenAiTextCostUsd, OPENAI_TEXT_MODEL } from './openAiPricing.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';
import type { OpenAiResponsesClient, OpenAiUsage } from './OpenAiResponsesClient.js';

interface ExecuteOpenAiStructuredOperationDependencies {
  readonly nowMs?: () => number;
  readonly responses: OpenAiResponsesClient;
  readonly telemetry: AiTelemetryReporter;
}

interface ExecuteOpenAiStructuredOperationParams<Output> {
  readonly errorMessage: string;
  readonly input: string;
  readonly instructions: string;
  readonly maxOutputTokens: number;
  readonly operation: AiOperation;
  readonly promptVersion: string;
  readonly schema: z.ZodType<Output>;
  readonly schemaName: string;
}

export async function executeOpenAiStructuredOperation<Output>(
  dependencies: ExecuteOpenAiStructuredOperationDependencies,
  params: ExecuteOpenAiStructuredOperationParams<Output>,
): Promise<Output> {
  const nowMs = dependencies.nowMs ?? Date.now;
  const startedAt = nowMs();
  let usage = emptyUsage();

  try {
    const response = await dependencies.responses.createStructuredResponse({
      input: params.input,
      instructions: params.instructions,
      maxOutputTokens: params.maxOutputTokens,
      model: OPENAI_TEXT_MODEL,
      promptVersion: params.promptVersion,
      schema: params.schema,
      schemaName: params.schemaName,
    });
    usage = response.usage;
    const output = params.schema.parse(response.output);

    await recordTelemetry({
      dependencies,
      nowMs,
      operation: params.operation,
      params,
      result: 'success',
      startedAt,
      usage,
    });

    return output;
  } catch (error) {
    await recordTelemetry({
      dependencies,
      nowMs,
      operation: params.operation,
      params,
      result: 'failure',
      startedAt,
      usage,
    });
    throw error instanceof OpenAiProviderError
      ? error
      : new OpenAiProviderError(params.errorMessage, { cause: error });
  }
}

interface RecordTelemetryParams<Output> {
  readonly dependencies: ExecuteOpenAiStructuredOperationDependencies;
  readonly nowMs: () => number;
  readonly operation: AiOperation;
  readonly params: ExecuteOpenAiStructuredOperationParams<Output>;
  readonly result: AiTelemetryResult;
  readonly startedAt: number;
  readonly usage: OpenAiUsage;
}

async function recordTelemetry<Output>(params: RecordTelemetryParams<Output>): Promise<void> {
  try {
    await params.dependencies.telemetry.record({
      cachedInputTokens: params.usage.cachedInputTokens,
      estimatedCostUsd: estimateOpenAiTextCostUsd(params.usage),
      inputTokens: params.usage.inputTokens,
      latencyMs: params.nowMs() - params.startedAt,
      model: OPENAI_TEXT_MODEL,
      operation: params.operation,
      outputTokens: params.usage.outputTokens,
      promptVersion: params.params.promptVersion,
      result: params.result,
    });
  } catch {
    // La telemetria es best-effort: nunca debe sustituir el resultado funcional.
  }
}

function emptyUsage(): OpenAiUsage {
  return { cachedInputTokens: 0, inputTokens: 0, outputTokens: 0 };
}
