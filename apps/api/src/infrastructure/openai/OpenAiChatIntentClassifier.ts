import { z } from 'zod';
import { ChatAgentSchema } from '@admin/contracts';
import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type {
  ChatIntentClassificationResult,
  ChatIntentClassifier,
} from '../../application/ports/ChatIntentClassifier.js';
import { executeOpenAiStructuredOperation } from './executeOpenAiStructuredOperation.js';
import type { OpenAiResponsesClient } from './OpenAiResponsesClient.js';
import { chatIntentPrompt } from './versionedPrompts.js';

const ChatIntentOutputSchema = z.object({
  agent: ChatAgentSchema,
});

interface OpenAiChatIntentClassifierDependencies {
  readonly nowMs?: () => number;
  readonly responses: OpenAiResponsesClient;
  readonly telemetry: AiTelemetryReporter;
}

export class OpenAiChatIntentClassifier implements ChatIntentClassifier {
  constructor(private readonly dependencies: OpenAiChatIntentClassifierDependencies) {}

  async classify(message: string): Promise<ChatIntentClassificationResult> {
    const output = await executeOpenAiStructuredOperation(this.dependencies, {
      errorMessage: 'No se pudo clasificar la intención del chat con OpenAI.',
      input: message,
      instructions: chatIntentPrompt.instructions,
      maxOutputTokens: 80,
      operation: 'chat-intent-classification',
      promptVersion: chatIntentPrompt.version,
      schema: ChatIntentOutputSchema,
      schemaName: 'chat_intent_v1',
    });

    return { agent: output.agent, provider: 'openai' };
  }
}
