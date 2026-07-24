import { describe, expect, it } from 'vitest';
import { estimateOpenAiTextCostUsd } from './openAiPricing.js';

describe('estimateOpenAiTextCostUsd', () => {
  it('estima coste con tokens de entrada, cache y salida', () => {
    expect(
      estimateOpenAiTextCostUsd({
        inputTokens: 1_000,
        cachedInputTokens: 250,
        outputTokens: 500,
      }),
    ).toBeCloseTo(0.00023875, 8);
  });

  it('no factura tokens de entrada negativos si la caché supera la entrada', () => {
    expect(
      estimateOpenAiTextCostUsd({
        inputTokens: 100,
        cachedInputTokens: 200,
        outputTokens: 0,
      }),
    ).toBeCloseTo(0.000001, 8);
  });
});
