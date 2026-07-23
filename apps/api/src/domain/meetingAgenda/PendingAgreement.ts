export interface PendingAgreement {
  readonly assignee?: string;
  readonly createdAt: Date;
  readonly description: string;
  readonly dueDate?: string;
  readonly id: string;
  readonly sessionId: string;
}
