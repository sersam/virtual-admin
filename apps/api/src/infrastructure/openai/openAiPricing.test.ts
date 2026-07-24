import { describe, expect, it } from 'vitest';
import { estimateGpt56LunaCostUsd } from './openAiPricing.js';

describe('estimateGpt56LunaCostUsd', () => {
  it('estima coste con tokens de entrada, cache y salida', () => {
    expect(
      estimateGpt56LunaCostUsd({
        inputTokens: 1_000,
        cachedInputTokens: 250,
        outputTokens: 500,
      }),
    ).toBeCloseTo(0.003775, 8);
  });
});
