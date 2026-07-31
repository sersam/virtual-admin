import type { AiFallbackReason } from '@admin/contracts';
import type {
  AiActionQuotaRepository,
  AiActionQuotaReservationInput,
} from '../ports/AiActionQuotaRepository.js';

interface AiActionQuotaPolicyDependencies {
  readonly logger?: { readonly error: (message: string, error: unknown) => void };
  readonly repository: AiActionQuotaRepository;
}

type ReserveAiActionQuotaInput = AiActionQuotaReservationInput;

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
    } catch (error) {
      this.dependencies.logger?.error('ai-action-quota-unavailable', error);
      return { allowed: false, fallbackReason: 'quota-unavailable' };
    }
  }
}

export function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
