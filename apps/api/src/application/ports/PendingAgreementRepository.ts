import type { PendingAgreement } from '../../domain/meetingAgenda/PendingAgreement.js';

export interface PendingAgreementRepository {
  listBySession(sessionId: string): Promise<PendingAgreement[]>;
  save(pendingAgreement: PendingAgreement): Promise<void>;
}
