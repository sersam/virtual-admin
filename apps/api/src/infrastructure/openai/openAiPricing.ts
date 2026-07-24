export const GPT_5_6_LUNA_MODEL = 'gpt-5.6-luna';

const GPT_5_6_LUNA_INPUT_USD_PER_MILLION = 1;
const GPT_5_6_LUNA_CACHED_INPUT_USD_PER_MILLION = 0.1;
const GPT_5_6_LUNA_OUTPUT_USD_PER_MILLION = 6;
const TOKENS_PER_MILLION = 1_000_000;

interface TokenUsage {
  readonly cachedInputTokens: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export function estimateGpt56LunaCostUsd(usage: TokenUsage): number {
  const billedInputTokens = Math.max(usage.inputTokens - usage.cachedInputTokens, 0);

  return (
    (billedInputTokens * GPT_5_6_LUNA_INPUT_USD_PER_MILLION +
      usage.cachedInputTokens * GPT_5_6_LUNA_CACHED_INPUT_USD_PER_MILLION +
      usage.outputTokens * GPT_5_6_LUNA_OUTPUT_USD_PER_MILLION) /
    TOKENS_PER_MILLION
  );
}
