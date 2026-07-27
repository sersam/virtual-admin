export interface PendingAgreement {
  readonly assignee?: string;
  readonly createdAt: Date;
  readonly description: string;
  readonly dueDate?: string;
  readonly id: string;
  readonly sessionId: string;
}

export function createPendingAgreementSignature(agreement: PendingAgreement): string {
  return JSON.stringify(
    [agreement.description, agreement.assignee ?? '', agreement.dueDate ?? ''].map((value) =>
      value.trim().toLocaleLowerCase('es'),
    ),
  );
}
