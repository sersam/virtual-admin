import { describe, expect, it } from 'vitest';
import { DeterministicCommunityNoticeGenerator } from '../communication/DeterministicCommunityNoticeGenerator.js';
import { DeterministicDocumentAnswerGenerator } from '../document/DeterministicDocumentAnswerGenerator.js';
import { DeterministicIncidentClassifier } from '../incident/DeterministicIncidentClassifier.js';
import { OpenAiCommunityNoticeGenerator } from './OpenAiCommunityNoticeGenerator.js';
import { OpenAiDocumentAnswerGenerator } from './OpenAiDocumentAnswerGenerator.js';
import { OpenAiEmbeddingProvider } from './OpenAiEmbeddingProvider.js';
import { OpenAiIncidentClassifier } from './OpenAiIncidentClassifier.js';
import { createAiProviders } from './createAiProviders.js';

describe('createAiProviders', () => {
  it('usa proveedores demo cuando falta OPENAI_API_KEY', () => {
    const providers = createAiProviders({});

    expect(providers.communityNoticeGenerator).toBeInstanceOf(
      DeterministicCommunityNoticeGenerator,
    );
    expect(providers.embeddingProvider).toBeUndefined();
    expect(providers.incidentClassifier).toBeInstanceOf(DeterministicIncidentClassifier);
    expect(providers.documentAnswerGenerator).toBeInstanceOf(DeterministicDocumentAnswerGenerator);
  });

  it('usa proveedores demo cuando OPENAI_API_KEY solo contiene espacios', () => {
    const providers = createAiProviders({ openAiApiKey: '   ' });

    expect(providers.communityNoticeGenerator).toBeInstanceOf(
      DeterministicCommunityNoticeGenerator,
    );
    expect(providers.embeddingProvider).toBeUndefined();
    expect(providers.incidentClassifier).toBeInstanceOf(DeterministicIncidentClassifier);
    expect(providers.documentAnswerGenerator).toBeInstanceOf(DeterministicDocumentAnswerGenerator);
  });

  it('usa proveedores OpenAI cuando existe OPENAI_API_KEY', () => {
    const providers = createAiProviders({ openAiApiKey: 'sk-test' });

    expect(providers.communityNoticeGenerator).toBeInstanceOf(OpenAiCommunityNoticeGenerator);
    expect(providers.documentAnswerGenerator).toBeInstanceOf(OpenAiDocumentAnswerGenerator);
    expect(providers.embeddingProvider).toBeInstanceOf(OpenAiEmbeddingProvider);
    expect(providers.incidentClassifier).toBeInstanceOf(OpenAiIncidentClassifier);
  });
});
