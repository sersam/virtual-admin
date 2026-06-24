import type { ChatMessageResponse } from '@admin/contracts';
import type { ChatWorkflow } from '../ports/ChatWorkflow.js';

interface CoordinateChatMessageDependencies {
  readonly workflow: ChatWorkflow;
}

export class CoordinateChatMessage {
  constructor(private readonly dependencies: CoordinateChatMessageDependencies) {}

  async execute(message: string): Promise<ChatMessageResponse> {
    return this.dependencies.workflow.run(message);
  }
}
