import type { AiFallbackReason } from '@admin/contracts';

export interface AiActionQuotaReservationInput {
  readonly day: string;
  readonly ipHash: string;
  readonly ipLimit: number;
  readonly sessionHash: string;
  readonly sessionLimit: number;
}

export type AiActionQuotaExceededReason = Extract<AiFallbackReason, 'session-quota' | 'ip-quota'>;

export type AiActionQuotaReservationResult =
  | { readonly status: 'reserved' }
  | {
      readonly reason: AiActionQuotaExceededReason;
      readonly status: 'rejected';
    };

export interface AiActionQuotaRepository {
  reserve(input: AiActionQuotaReservationInput): Promise<AiActionQuotaReservationResult>;
}
