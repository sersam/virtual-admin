import type { UploadedCommunityDocument } from '../../domain/document/UploadedCommunityDocument.js';
import type { UploadedDocumentRepository } from '../ports/UploadedDocumentRepository.js';

interface GetUploadedDocumentDependencies {
  readonly repository: UploadedDocumentRepository;
}

interface GetUploadedDocumentInput {
  readonly sessionId: string;
  readonly documentId: string;
}

export class UploadedDocumentNotFoundError extends Error {
  constructor() {
    super('No se ha encontrado el PDF adjunto.');
  }
}

export class GetUploadedDocument {
  constructor(private readonly dependencies: GetUploadedDocumentDependencies) {}

  async execute(input: GetUploadedDocumentInput): Promise<UploadedCommunityDocument> {
    const documents = await this.dependencies.repository.listBySession(input.sessionId);
    const document = documents.find(({ id }) => id === input.documentId);
    if (!document) {
      throw new UploadedDocumentNotFoundError();
    }

    return document;
  }
}
