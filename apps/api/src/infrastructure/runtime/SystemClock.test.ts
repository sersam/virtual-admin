import { describe, expect, it, vi } from 'vitest';
import { SystemClock } from './SystemClock.js';

describe('SystemClock', () => {
  it('devuelve la fecha actual del sistema', () => {
    const now = new Date('2026-06-23T08:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(new SystemClock().now()).toEqual(now);

    vi.useRealTimers();
  });
});
