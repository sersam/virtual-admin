import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type { ChatIntentClassifier } from '../../application/ports/ChatIntentClassifier.js';
import type { CommunityNoticeGenerator } from '../../application/ports/CommunityNoticeGenerator.js';
import type { DocumentAnswerGenerator } from '../../application/ports/DocumentAnswerGenerator.js';
import type { EmbeddingProvider } from '../../application/ports/EmbeddingProvider.js';
import type { IncidentClassifier } from '../../application/ports/IncidentClassifier.js';
import { DeterministicCommunityNoticeGenerator } from '../communication/DeterministicCommunityNoticeGenerator.js';
import { DeterministicDocumentAnswerGenerator } from '../document/DeterministicDocumentAnswerGenerator.js';
import { DeterministicChatIntentClassifier } from '../agent/DeterministicChatIntentClassifier.js';
import { DeterministicIncidentClassifier } from '../incident/DeterministicIncidentClassifier.js';
import { ConsoleAiTelemetryReporter } from './ConsoleAiTelemetryReporter.js';
import { OpenAiCommunityNoticeGenerator } from './OpenAiCommunityNoticeGenerator.js';
import { OpenAiDocumentAnswerGenerator } from './OpenAiDocumentAnswerGenerator.js';
import {
  OfficialOpenAiEmbeddingsClient,
  OpenAiEmbeddingProvider,
} from './OpenAiEmbeddingProvider.js';
import { OpenAiIncidentClassifier } from './OpenAiIncidentClassifier.js';
import { OfficialOpenAiResponsesClient } from './OpenAiResponsesClient.js';

export interface AiProviders {
  readonly chatIntentClassifier: ChatIntentClassifier;
  readonly communityNoticeGenerator: CommunityNoticeGenerator;
  readonly documentAnswerGenerator: DocumentAnswerGenerator;
  readonly embeddingProvider?: EmbeddingProvider;
  readonly incidentClassifier: IncidentClassifier;
}

interface CreateAiProvidersOptions {
  readonly openAiApiKey?: string;
  readonly telemetry?: AiTelemetryReporter;
}

export function createAiProviders(options: CreateAiProvidersOptions): AiProviders {
  const openAiApiKey = options.openAiApiKey?.trim();

  if (!openAiApiKey) {
    return {
      chatIntentClassifier: new DeterministicChatIntentClassifier(),
      communityNoticeGenerator: new DeterministicCommunityNoticeGenerator(),
      documentAnswerGenerator: new DeterministicDocumentAnswerGenerator(),
      incidentClassifier: new DeterministicIncidentClassifier(),
    };
  }

  const responses = new OfficialOpenAiResponsesClient(openAiApiKey);
  const telemetry = options.telemetry ?? new ConsoleAiTelemetryReporter();

  return {
    chatIntentClassifier: new DeterministicChatIntentClassifier(),
    communityNoticeGenerator: new OpenAiCommunityNoticeGenerator({ responses, telemetry }),
    documentAnswerGenerator: new OpenAiDocumentAnswerGenerator({ responses, telemetry }),
    embeddingProvider: new OpenAiEmbeddingProvider({
      client: new OfficialOpenAiEmbeddingsClient(openAiApiKey),
      telemetry,
    }),
    incidentClassifier: new OpenAiIncidentClassifier({ responses, telemetry }),
  };
}
