import type { DocumentRetriever } from '../../application/ports/DocumentRetriever.js';
import type {
  CommunityDocument,
  RetrievedDocument,
} from '../../domain/document/CommunityDocument.js';
import { searchDocuments } from './lexicalDocumentSearch.js';

export class LexicalDocumentRetriever implements DocumentRetriever {
  constructor(private readonly documents: readonly CommunityDocument[]) {}

  async retrieve(question: string, maxSources: number): Promise<RetrievedDocument[]> {
    return searchDocuments(this.documents, question, maxSources);
  }
}
