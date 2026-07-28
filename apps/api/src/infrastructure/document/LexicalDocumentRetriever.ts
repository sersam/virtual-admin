import type { DocumentRetriever } from '../../application/ports/DocumentRetriever.js';
import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import type {
  CommunityDocument,
  RetrievedDocument,
} from '../../domain/document/CommunityDocument.js';
import type { UploadedCommunityDocument } from '../../domain/document/UploadedCommunityDocument.js';
import { searchDocuments } from './lexicalDocumentSearch.js';

export class LexicalDocumentRetriever implements DocumentRetriever {
  readonly mode = 'lexical-demo';

  constructor(
    private readonly documents: readonly CommunityDocument[],
    private readonly uploadedDocumentRepository?: UploadedDocumentRepository,
  ) {}

  async retrieve(
    question: string,
    maxSources: number,
    context: { readonly sessionId?: string } = {},
  ): Promise<RetrievedDocument[]> {
    const [baseDocuments, uploadedDocuments] = await Promise.all([
      Promise.resolve(searchDocuments(this.documents, question, maxSources)),
      context.sessionId && this.uploadedDocumentRepository
        ? this.retrieveUploadedDocuments(context.sessionId, question, maxSources)
        : Promise.resolve([]),
    ]);

    return [...uploadedDocuments, ...baseDocuments]
      .sort((left, right) => right.score - left.score)
      .slice(0, maxSources);
  }

  private async retrieveUploadedDocuments(
    sessionId: string,
    question: string,
    maxSources: number,
  ): Promise<RetrievedDocument[]> {
    const documents = await this.uploadedDocumentRepository?.listBySession(sessionId);
    return searchDocuments(
      documents?.map(toUploadedCommunityDocumentSource) ?? [],
      question,
      maxSources,
    );
  }
}

export function toUploadedCommunityDocumentSource(
  document: UploadedCommunityDocument,
): CommunityDocument {
  return {
    id: document.id,
    title: document.title,
    type: 'adjunto',
    section: 'Documento adjunto',
    content: document.textContent,
    documentUrl: document.documentUrl,
  };
}
