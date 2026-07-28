import type { DocumentChunkRepository } from '../../application/ports/DocumentChunkRepository.js';
import type { DocumentRetriever } from '../../application/ports/DocumentRetriever.js';
import type { EmbeddingProvider } from '../../application/ports/EmbeddingProvider.js';
import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import type { CommunityDocument } from '../../domain/document/CommunityDocument.js';
import { LexicalDocumentRetriever } from './LexicalDocumentRetriever.js';
import { SemanticDocumentRetriever } from './SemanticDocumentRetriever.js';

interface CreateDocumentRetrieverOptions {
  readonly documentChunkRepository?: DocumentChunkRepository;
  readonly documents: readonly CommunityDocument[];
  readonly embeddingProvider?: EmbeddingProvider;
  readonly uploadedDocumentRepository: UploadedDocumentRepository;
}

export function createDocumentRetriever(
  options: CreateDocumentRetrieverOptions,
): DocumentRetriever {
  if (options.documentChunkRepository && options.embeddingProvider) {
    return new SemanticDocumentRetriever({
      chunkRepository: options.documentChunkRepository,
      documents: options.documents,
      embeddingProvider: options.embeddingProvider,
      uploadedDocumentRepository: options.uploadedDocumentRepository,
    });
  }

  return new LexicalDocumentRetriever(options.documents, options.uploadedDocumentRepository);
}
