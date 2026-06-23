import type { RetrievedDocument } from '../../domain/document/CommunityDocument.js';

export interface DocumentRetriever {
  retrieve(question: string, maxSources: number): Promise<RetrievedDocument[]>;
}
