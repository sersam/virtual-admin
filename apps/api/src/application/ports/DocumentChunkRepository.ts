import type { CommunityDocumentType } from '../../domain/document/CommunityDocument.js';

export interface StoredDocumentChunk {
  readonly chunkIndex: number;
  readonly content: string;
  readonly documentFingerprint: string;
  readonly documentId: string;
  readonly documentUrl: string;
  readonly embedding: readonly number[];
  readonly embeddingModel: string;
  readonly id: string;
  readonly section: string;
  readonly sessionId?: string;
  readonly title: string;
  readonly type: CommunityDocumentType;
}

export interface IndexedDocumentVersion {
  readonly documentFingerprint: string;
  readonly documentId: string;
  readonly embeddingModel: string;
  readonly sessionId?: string;
}

export interface RetrievedDocumentChunk {
  readonly chunkIndex: number;
  readonly content: string;
  readonly documentId: string;
  readonly documentUrl: string;
  readonly score: number;
  readonly section: string;
  readonly title: string;
  readonly type: CommunityDocumentType;
}

export interface DocumentChunkRepository {
  listIndexedDocuments(params: {
    readonly embeddingModel: string;
    readonly sessionId?: string;
  }): Promise<IndexedDocumentVersion[]>;
  replaceDocumentChunks(params: {
    readonly chunks: readonly StoredDocumentChunk[];
    readonly documentFingerprint: string;
    readonly documentId: string;
    readonly embeddingModel: string;
    readonly sessionId?: string;
  }): Promise<void>;
  searchNearest(params: {
    readonly embedding: readonly number[];
    readonly embeddingModel: string;
    readonly limit: number;
    readonly sessionId?: string;
  }): Promise<RetrievedDocumentChunk[]>;
}
