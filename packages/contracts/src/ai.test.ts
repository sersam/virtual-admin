import { describe, expect, it } from 'vitest';
import { AiFallbackReasonSchema } from './ai.js';

describe('ai contracts', () => {
  it('define los motivos publicos de fallback determinista', () => {
    expect(AiFallbackReasonSchema.options).toEqual([
      'session-quota',
      'ip-quota',
      'provider-error',
      'quota-unavailable',
    ]);
  });
});
