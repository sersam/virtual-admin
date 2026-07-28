import type { ChatAgent, ChatProvider } from '@admin/contracts';

export type ChatIntentProvider = ChatProvider;

export interface ChatIntentClassificationResult {
  readonly agent: ChatAgent;
  readonly provider: ChatIntentProvider;
}

export interface ChatIntentClassifier {
  classify(message: string): Promise<ChatIntentClassificationResult>;
}
