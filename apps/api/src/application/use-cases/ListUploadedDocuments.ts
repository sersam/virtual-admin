import type { UploadedDocument } from '@admin/contracts';
import type { UploadedDocumentRepository } from '../ports/UploadedDocumentRepository.js';
import { presentUploadedDocument } from './StoreUploadedDocument.js';

interface ListUploadedDocumentsDependencies {
  readonly repository: UploadedDocumentRepository;
}

export class ListUploadedDocuments {
  constructor(private readonly dependencies: ListUploadedDocumentsDependencies) {}

  async execute(sessionId: string): Promise<UploadedDocument[]> {
    const documents = await this.dependencies.repository.listBySession(sessionId);
    return documents.map(presentUploadedDocument);
  }
}
