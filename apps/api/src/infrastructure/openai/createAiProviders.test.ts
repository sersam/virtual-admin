import { describe, expect, it } from 'vitest';
import { DeterministicCommunityNoticeGenerator } from '../communication/DeterministicCommunityNoticeGenerator.js';
import { DeterministicIncidentClassifier } from '../incident/DeterministicIncidentClassifier.js';
import { OpenAiCommunityNoticeGenerator } from './OpenAiCommunityNoticeGenerator.js';
import { OpenAiIncidentClassifier } from './OpenAiIncidentClassifier.js';
import { createAiProviders } from './createAiProviders.js';

describe('createAiProviders', () => {
  it('usa proveedores demo cuando falta OPENAI_API_KEY', () => {
    const providers = createAiProviders({});

    expect(providers.communityNoticeGenerator).toBeInstanceOf(
      DeterministicCommunityNoticeGenerator,
    );
    expect(providers.incidentClassifier).toBeInstanceOf(DeterministicIncidentClassifier);
  });

  it('usa proveedores OpenAI cuando existe OPENAI_API_KEY', () => {
    const providers = createAiProviders({ openAiApiKey: 'sk-test' });

    expect(providers.communityNoticeGenerator).toBeInstanceOf(OpenAiCommunityNoticeGenerator);
    expect(providers.incidentClassifier).toBeInstanceOf(OpenAiIncidentClassifier);
  });
});
