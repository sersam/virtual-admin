import type { SessionDocumentRetriever } from '../../application/ports/SessionDocumentRetriever.js';
import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import type { CommunityDocument } from '../../domain/document/CommunityDocument.js';
import type { UploadedCommunityDocument } from '../../domain/document/UploadedCommunityDocument.js';
import { searchDocuments } from './lexicalDocumentSearch.js';

export class UploadedSessionDocumentRetriever implements SessionDocumentRetriever {
  constructor(private readonly repository: UploadedDocumentRepository) {}

  async retrieveForSession(
    sessionId: string,
    question: string,
    maxSources: number,
  ): Promise<ReturnType<typeof searchDocuments>> {
    const documents = await this.repository.listBySession(sessionId);

    return searchDocuments(documents.map(toCommunityDocument), question, maxSources);
  }
}

function toCommunityDocument(document: UploadedCommunityDocument): CommunityDocument {
  return {
    id: document.id,
    title: document.title,
    type: 'adjunto',
    section: 'Documento adjunto',
    content: document.textContent,
    documentUrl: document.documentUrl,
  };
}
