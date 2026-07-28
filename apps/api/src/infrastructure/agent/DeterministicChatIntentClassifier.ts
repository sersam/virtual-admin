import type {
  ChatIntentClassificationResult,
  ChatIntentClassifier,
} from '../../application/ports/ChatIntentClassifier.js';
import { classifyIntent } from '../../domain/agent/IntentClassifier.js';

export class DeterministicChatIntentClassifier implements ChatIntentClassifier {
  async classify(message: string): Promise<ChatIntentClassificationResult> {
    return {
      agent: classifyIntent(message),
      provider: 'deterministic-demo',
    };
  }
}
