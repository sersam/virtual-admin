import type { ChatMessageResponse } from '@admin/contracts';

export interface ChatWorkflow {
  run(message: string): Promise<ChatMessageResponse>;
}
