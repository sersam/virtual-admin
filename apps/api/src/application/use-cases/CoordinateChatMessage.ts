import type { ChatMessageResponse } from '@admin/contracts';
import type { ChatWorkflow, ChatWorkflowContext } from '../ports/ChatWorkflow.js';

interface CoordinateChatMessageDependencies {
  readonly workflow: ChatWorkflow;
}

export class CoordinateChatMessage {
  constructor(private readonly dependencies: CoordinateChatMessageDependencies) {}

  async execute(message: string, context: ChatWorkflowContext = {}): Promise<ChatMessageResponse> {
    return this.dependencies.workflow.run(message, context);
  }
}
