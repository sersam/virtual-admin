import type { PendingAgreementRepository } from '../../application/ports/PendingAgreementRepository.js';
import type { PendingAgreement } from '../../domain/meetingAgenda/PendingAgreement.js';

export class InMemoryPendingAgreementRepository implements PendingAgreementRepository {
  private readonly agreements = new Map<string, PendingAgreement[]>();

  async listBySession(sessionId: string): Promise<PendingAgreement[]> {
    return this.agreements.get(sessionId) ?? [];
  }

  async save(pendingAgreement: PendingAgreement): Promise<void> {
    const current = this.agreements.get(pendingAgreement.sessionId) ?? [];
    const signature = createPendingAgreementSignature(pendingAgreement);
    const alreadyStored = current.some(
      (agreement) => createPendingAgreementSignature(agreement) === signature,
    );

    if (alreadyStored) return;

    this.agreements.set(pendingAgreement.sessionId, [...current, pendingAgreement]);
  }

  async saveIfAbsent(pendingAgreement: PendingAgreement): Promise<void> {
    const current = this.agreements.get(pendingAgreement.sessionId) ?? [];
    if (current.some((agreement) => agreement.id === pendingAgreement.id)) return;

    this.agreements.set(pendingAgreement.sessionId, [...current, pendingAgreement]);
  }
}

function createPendingAgreementSignature(agreement: PendingAgreement): string {
  return JSON.stringify(
    [agreement.description, agreement.assignee ?? '', agreement.dueDate ?? ''].map((value) =>
      value.trim().toLocaleLowerCase('es'),
    ),
  );
}
