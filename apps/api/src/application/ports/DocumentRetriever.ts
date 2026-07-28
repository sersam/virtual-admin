import type { RetrievedDocument } from '../../domain/document/CommunityDocument.js';

export type DocumentRetrievalMode = 'lexical-demo' | 'semantic-pgvector';

export interface DocumentRetriever {
  readonly mode: DocumentRetrievalMode;
  retrieve(
    question: string,
    maxSources: number,
    context?: { readonly sessionId?: string },
  ): Promise<RetrievedDocument[]>;
}
