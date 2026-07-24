export const OPENAI_TEXT_MODEL = 'gpt-5-nano';

const OPENAI_TEXT_INPUT_USD_PER_MILLION = 0.05;
const OPENAI_TEXT_CACHED_INPUT_USD_PER_MILLION = 0.005;
const OPENAI_TEXT_OUTPUT_USD_PER_MILLION = 0.4;
const TOKENS_PER_MILLION = 1_000_000;

interface TokenUsage {
  readonly cachedInputTokens: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export function estimateOpenAiTextCostUsd(usage: TokenUsage): number {
  const billedInputTokens = Math.max(usage.inputTokens - usage.cachedInputTokens, 0);

  return (
    (billedInputTokens * OPENAI_TEXT_INPUT_USD_PER_MILLION +
      usage.cachedInputTokens * OPENAI_TEXT_CACHED_INPUT_USD_PER_MILLION +
      usage.outputTokens * OPENAI_TEXT_OUTPUT_USD_PER_MILLION) /
    TOKENS_PER_MILLION
  );
}
