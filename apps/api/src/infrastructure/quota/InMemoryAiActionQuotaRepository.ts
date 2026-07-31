import type {
  AiActionQuotaRepository,
  AiActionQuotaReservationInput,
  AiActionQuotaReservationResult,
} from '../../application/ports/AiActionQuotaRepository.js';

interface QuotaCounter {
  readonly limit: number;
  readonly used: number;
}

export class InMemoryAiActionQuotaRepository implements AiActionQuotaRepository {
  private readonly counters = new Map<string, QuotaCounter>();

  async reserve(input: AiActionQuotaReservationInput): Promise<AiActionQuotaReservationResult> {
    const sessionKey = buildCounterKey('session', input.day, input.sessionHash);
    const ipKey = buildCounterKey('ip', input.day, input.ipHash);
    const sessionCounter = this.counters.get(sessionKey) ?? { limit: input.sessionLimit, used: 0 };
    const ipCounter = this.counters.get(ipKey) ?? { limit: input.ipLimit, used: 0 };

    if (sessionCounter.used >= input.sessionLimit) {
      this.counters.set(sessionKey, { ...sessionCounter, limit: input.sessionLimit });
      this.counters.set(ipKey, { ...ipCounter, limit: input.ipLimit });
      return { status: 'rejected', reason: 'session-quota' };
    }
    if (ipCounter.used >= input.ipLimit) {
      this.counters.set(sessionKey, { ...sessionCounter, limit: input.sessionLimit });
      this.counters.set(ipKey, { ...ipCounter, limit: input.ipLimit });
      return { status: 'rejected', reason: 'ip-quota' };
    }

    this.counters.set(sessionKey, {
      limit: input.sessionLimit,
      used: sessionCounter.used + 1,
    });
    this.counters.set(ipKey, {
      limit: input.ipLimit,
      used: ipCounter.used + 1,
    });
    return { status: 'reserved' };
  }

  getUsedForTest(scope: 'ip' | 'session', day: string, hash: string): number {
    return this.counters.get(buildCounterKey(scope, day, hash))?.used ?? 0;
  }
}

function buildCounterKey(scope: 'ip' | 'session', day: string, hash: string): string {
  return `${scope}:${day}:${hash}`;
}
