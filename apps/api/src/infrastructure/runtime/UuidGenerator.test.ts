import { describe, expect, it } from 'vitest';
import { UuidGenerator } from './UuidGenerator.js';

describe('UuidGenerator', () => {
  it('genera identificadores UUID válidos y no deterministas', () => {
    const generator = new UuidGenerator();
    const firstId = generator.randomId();
    const secondId = generator.randomId();

    expect(firstId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(secondId).not.toBe(firstId);
  });
});
