import type { AiFallbackReason } from '@admin/contracts';
import type { AiActionQuotaRepository } from '../ports/AiActionQuotaRepository.js';

interface AiActionQuotaPolicyDependencies {
  readonly repository: AiActionQuotaRepository;
}

interface ReserveAiActionQuotaInput {
  readonly day: string;
  readonly ipHash: string;
  readonly ipLimit: number;
  readonly sessionHash: string;
  readonly sessionLimit: number;
}

export type AiActionQuotaDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly fallbackReason: AiFallbackReason;
    };

export class AiActionQuotaPolicy {
  constructor(private readonly dependencies: AiActionQuotaPolicyDependencies) {}

  async reserve(input: ReserveAiActionQuotaInput): Promise<AiActionQuotaDecision> {
    try {
      const result = await this.dependencies.repository.reserve(input);
      if (result.status === 'reserved') return { allowed: true };
      return { allowed: false, fallbackReason: result.reason };
    } catch {
      return { allowed: false, fallbackReason: 'quota-unavailable' };
    }
  }
}

export function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
