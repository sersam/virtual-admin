import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type { CommunityNoticeGenerator } from '../../application/ports/CommunityNoticeGenerator.js';
import type { EmbeddingProvider } from '../../application/ports/EmbeddingProvider.js';
import type { IncidentClassifier } from '../../application/ports/IncidentClassifier.js';
import { DeterministicCommunityNoticeGenerator } from '../communication/DeterministicCommunityNoticeGenerator.js';
import { DeterministicIncidentClassifier } from '../incident/DeterministicIncidentClassifier.js';
import { ConsoleAiTelemetryReporter } from './ConsoleAiTelemetryReporter.js';
import { OpenAiCommunityNoticeGenerator } from './OpenAiCommunityNoticeGenerator.js';
import {
  OfficialOpenAiEmbeddingsClient,
  OpenAiEmbeddingProvider,
} from './OpenAiEmbeddingProvider.js';
import { OpenAiIncidentClassifier } from './OpenAiIncidentClassifier.js';
import { OfficialOpenAiResponsesClient } from './OpenAiResponsesClient.js';

export interface AiProviders {
  readonly communityNoticeGenerator: CommunityNoticeGenerator;
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
      communityNoticeGenerator: new DeterministicCommunityNoticeGenerator(),
      incidentClassifier: new DeterministicIncidentClassifier(),
    };
  }

  const responses = new OfficialOpenAiResponsesClient(openAiApiKey);
  const telemetry = options.telemetry ?? new ConsoleAiTelemetryReporter();

  return {
    communityNoticeGenerator: new OpenAiCommunityNoticeGenerator({ responses, telemetry }),
    embeddingProvider: new OpenAiEmbeddingProvider({
      client: new OfficialOpenAiEmbeddingsClient(openAiApiKey),
      telemetry,
    }),
    incidentClassifier: new OpenAiIncidentClassifier({ responses, telemetry }),
  };
}
