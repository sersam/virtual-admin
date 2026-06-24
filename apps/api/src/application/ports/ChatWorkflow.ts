import type { ChatMessageResponse } from '@admin/contracts';

export interface ChatWorkflowContext {
  readonly sessionId?: string;
}

export interface ChatWorkflow {
  run(message: string, context?: ChatWorkflowContext): Promise<ChatMessageResponse>;
}
