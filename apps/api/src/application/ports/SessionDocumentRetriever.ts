import type { RetrievedDocument } from '../../domain/document/CommunityDocument.js';

export interface SessionDocumentRetriever {
  retrieveForSession(
    sessionId: string,
    question: string,
    maxSources: number,
  ): Promise<RetrievedDocument[]>;
}
