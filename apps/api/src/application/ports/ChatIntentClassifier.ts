import type { ChatAgent } from '@admin/contracts';

export type ChatIntentProvider = 'openai' | 'deterministic-demo';

export interface ChatIntentClassificationResult {
  readonly agent: ChatAgent;
  readonly provider: ChatIntentProvider;
}

export interface ChatIntentClassifier {
  classify(message: string): Promise<ChatIntentClassificationResult>;
}
