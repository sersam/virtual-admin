import type { UploadedCommunityDocument } from '../../domain/document/UploadedCommunityDocument.js';

export interface UploadedDocumentRepository {
  listBySession(sessionId: string): Promise<UploadedCommunityDocument[]>;
  save(document: UploadedCommunityDocument): Promise<void>;
}
