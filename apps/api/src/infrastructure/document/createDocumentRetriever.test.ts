import { describe, expect, it } from 'vitest';
import type { DocumentChunkRepository } from '../../application/ports/DocumentChunkRepository.js';
import type { EmbeddingProvider } from '../../application/ports/EmbeddingProvider.js';
import { InMemoryUploadedDocumentRepository } from './InMemoryUploadedDocumentRepository.js';
import { LexicalDocumentRetriever } from './LexicalDocumentRetriever.js';
import { SemanticDocumentRetriever } from './SemanticDocumentRetriever.js';
import { createDocumentRetriever } from './createDocumentRetriever.js';

describe('createDocumentRetriever', () => {
  it('usa recuperacion lexica cuando falta el repositorio vectorial o embeddings', () => {
    const uploadedDocumentRepository = new InMemoryUploadedDocumentRepository();

    expect(
      createDocumentRetriever({
        documents: [],
        uploadedDocumentRepository,
      }),
    ).toBeInstanceOf(LexicalDocumentRetriever);
    expect(
      createDocumentRetriever({
        documentChunkRepository: fakeChunkRepository(),
        documents: [],
        uploadedDocumentRepository,
      }),
    ).toBeInstanceOf(LexicalDocumentRetriever);
    expect(
      createDocumentRetriever({
        documents: [],
        embeddingProvider: fakeEmbeddingProvider(),
        uploadedDocumentRepository,
      }),
    ).toBeInstanceOf(LexicalDocumentRetriever);
  });

  it('usa recuperacion semantica cuando existen PostgreSQL vectorial y embeddings', () => {
    expect(
      createDocumentRetriever({
        documentChunkRepository: fakeChunkRepository(),
        documents: [],
        embeddingProvider: fakeEmbeddingProvider(),
        uploadedDocumentRepository: new InMemoryUploadedDocumentRepository(),
      }),
    ).toBeInstanceOf(SemanticDocumentRetriever);
  });
});

function fakeEmbeddingProvider(): EmbeddingProvider {
  return {
    dimensions: 3,
    embed: async () => ({ inputTokens: 0, vectors: [] }),
    model: 'test-model',
  };
}

function fakeChunkRepository(): DocumentChunkRepository {
  return {
    listIndexedDocuments: async () => [],
    replaceDocumentChunks: async () => undefined,
    searchNearest: async () => [],
  };
}
