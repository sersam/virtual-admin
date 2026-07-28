import { createHash } from 'node:crypto';
import type {
  DocumentChunkRepository,
  IndexedDocumentVersion,
  RetrievedDocumentChunk,
  StoredDocumentChunk,
} from '../../application/ports/DocumentChunkRepository.js';
import type { DocumentRetriever } from '../../application/ports/DocumentRetriever.js';
import type { EmbeddingProvider } from '../../application/ports/EmbeddingProvider.js';
import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import type {
  CommunityDocument,
  RetrievedDocument,
} from '../../domain/document/CommunityDocument.js';
import {
  chunkCommunityDocument,
  DOCUMENT_CHUNKING_VERSION,
  fingerprintCommunityDocument,
} from '../../domain/document/DocumentChunk.js';
import { toUploadedCommunityDocumentSource } from './LexicalDocumentRetriever.js';

const semanticSearchChunkLimit = 30;
const semanticMinimumScore = 0.5;

interface SemanticDocumentRetrieverDependencies {
  readonly chunkRepository: DocumentChunkRepository;
  readonly documents: readonly CommunityDocument[];
  readonly embeddingProvider: EmbeddingProvider;
  readonly uploadedDocumentRepository: UploadedDocumentRepository;
}

interface ScopedDocument {
  readonly document: CommunityDocument;
  readonly fingerprint: string;
  readonly sessionId?: string;
}

export class SemanticDocumentRetriever implements DocumentRetriever {
  readonly mode = 'semantic-pgvector';

  constructor(private readonly dependencies: SemanticDocumentRetrieverDependencies) {}

  async retrieve(
    question: string,
    maxSources: number,
    context: { readonly sessionId?: string } = {},
  ): Promise<RetrievedDocument[]> {
    const documents = await this.loadScopedDocuments(context.sessionId);
    const indexedDocuments = await this.dependencies.chunkRepository.listIndexedDocuments({
      embeddingModel: this.dependencies.embeddingProvider.model,
      sessionId: context.sessionId,
    });
    const pendingDocuments = documents.filter(
      (document) => !hasCurrentFingerprint(indexedDocuments, document),
    );
    const pendingChunks = pendingDocuments.flatMap((document) =>
      chunkCommunityDocument(document.document).map((chunk) => ({ ...chunk, document })),
    );
    const embeddings = await this.dependencies.embeddingProvider.embed([
      question,
      ...pendingChunks.map((chunk) => chunk.content),
    ]);
    const [questionEmbedding, ...chunkEmbeddings] = embeddings.vectors;

    await this.replacePendingDocuments(pendingDocuments, pendingChunks, chunkEmbeddings);

    const chunks = await this.dependencies.chunkRepository.searchNearest({
      embedding: questionEmbedding ?? [],
      embeddingModel: this.dependencies.embeddingProvider.model,
      limit: semanticSearchChunkLimit,
      sessionId: context.sessionId,
    });

    return collapseBestChunksByDocument(chunks, maxSources);
  }

  private async loadScopedDocuments(sessionId: string | undefined): Promise<ScopedDocument[]> {
    const uploadedDocuments = sessionId
      ? await this.dependencies.uploadedDocumentRepository.listBySession(sessionId)
      : [];
    const baseDocuments = this.dependencies.documents.map((document) =>
      toScopedDocument(document, undefined, this.dependencies.embeddingProvider.model),
    );
    const sessionDocuments = uploadedDocuments.map((document) =>
      toScopedDocument(
        toUploadedCommunityDocumentSource(document),
        sessionId,
        this.dependencies.embeddingProvider.model,
      ),
    );

    return [...baseDocuments, ...sessionDocuments];
  }

  private async replacePendingDocuments(
    pendingDocuments: readonly ScopedDocument[],
    pendingChunks: readonly {
      readonly content: string;
      readonly document: ScopedDocument;
      readonly index: number;
    }[],
    chunkEmbeddings: readonly (readonly number[])[],
  ): Promise<void> {
    let embeddingIndex = 0;

    for (const document of pendingDocuments) {
      const chunks = pendingChunks
        .filter((chunk) => chunk.document === document)
        .map<StoredDocumentChunk>((chunk) => ({
          chunkIndex: chunk.index,
          content: chunk.content,
          documentFingerprint: document.fingerprint,
          documentId: document.document.id,
          documentUrl: document.document.documentUrl,
          embedding: chunkEmbeddings[embeddingIndex++] ?? [],
          embeddingModel: this.dependencies.embeddingProvider.model,
          id: createChunkId(document, chunk.index),
          section: document.document.section,
          ...(document.sessionId ? { sessionId: document.sessionId } : {}),
          title: document.document.title,
          type: document.document.type,
        }));

      await this.dependencies.chunkRepository.replaceDocumentChunks({
        chunks,
        documentFingerprint: document.fingerprint,
        documentId: document.document.id,
        embeddingModel: this.dependencies.embeddingProvider.model,
        ...(document.sessionId ? { sessionId: document.sessionId } : {}),
      });
    }
  }
}

function toScopedDocument(
  document: CommunityDocument,
  sessionId: string | undefined,
  embeddingModel: string,
): ScopedDocument {
  return {
    document,
    fingerprint: fingerprintCommunityDocument(document, {
      chunkingVersion: DOCUMENT_CHUNKING_VERSION,
      embeddingModel,
    }),
    ...(sessionId ? { sessionId } : {}),
  };
}

function hasCurrentFingerprint(
  indexedDocuments: readonly IndexedDocumentVersion[],
  document: ScopedDocument,
): boolean {
  return indexedDocuments.some(
    (indexedDocument) =>
      indexedDocument.documentId === document.document.id &&
      indexedDocument.documentFingerprint === document.fingerprint &&
      (indexedDocument.sessionId ?? undefined) === (document.sessionId ?? undefined),
  );
}

function collapseBestChunksByDocument(
  chunks: readonly RetrievedDocumentChunk[],
  maxSources: number,
): RetrievedDocument[] {
  const documents = new Map<string, RetrievedDocument>();

  for (const chunk of chunks) {
    if (chunk.score < semanticMinimumScore || documents.has(chunk.documentId)) continue;

    documents.set(chunk.documentId, {
      content: chunk.content,
      documentUrl: chunk.documentUrl,
      id: chunk.documentId,
      score: chunk.score,
      section: chunk.section,
      title: chunk.title,
      type: chunk.type,
    });
    if (documents.size >= maxSources) break;
  }

  return [...documents.values()];
}

function createChunkId(document: ScopedDocument, chunkIndex: number): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        chunkIndex,
        documentId: document.document.id,
        sessionId: document.sessionId ?? null,
      }),
    )
    .digest('hex');
}
