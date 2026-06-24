import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import type { UploadedCommunityDocument } from '../../domain/document/UploadedCommunityDocument.js';

export class InMemoryUploadedDocumentRepository implements UploadedDocumentRepository {
  private readonly documents = new Map<string, UploadedCommunityDocument[]>();

  async listBySession(sessionId: string): Promise<UploadedCommunityDocument[]> {
    return [...(this.documents.get(sessionId) ?? [])];
  }

  async save(document: UploadedCommunityDocument): Promise<void> {
    const current = this.documents.get(document.sessionId) ?? [];
    this.documents.set(document.sessionId, [...current, document]);
  }
}
