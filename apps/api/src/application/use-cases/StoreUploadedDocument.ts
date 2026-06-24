import { PdfUploadConstraints, type UploadedDocument } from '@admin/contracts';
import type { UploadedDocumentRepository } from '../ports/UploadedDocumentRepository.js';
import type { UploadedDocumentTextExtractor } from '../ports/UploadedDocumentTextExtractor.js';
import type { Clock } from '../ports/Clock.js';
import type { IdGenerator } from '../ports/IdGenerator.js';

interface StoreUploadedDocumentDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly repository: UploadedDocumentRepository;
  readonly textExtractor: UploadedDocumentTextExtractor;
}

interface StoreUploadedDocumentInput {
  readonly sessionId: string;
  readonly filename: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly content: Uint8Array;
}

export class InvalidUploadedDocumentError extends Error {
  constructor() {
    super('El archivo adjunto debe ser un PDF válido.');
  }
}

export class UploadedDocumentTooLargeError extends Error {
  constructor() {
    super('El PDF adjunto supera el tamaño máximo permitido.');
  }
}

export class StoreUploadedDocument {
  constructor(private readonly dependencies: StoreUploadedDocumentDependencies) {}

  async execute(input: StoreUploadedDocumentInput): Promise<UploadedDocument> {
    if (input.contentType !== PdfUploadConstraints.mimeType || !input.filename.endsWith('.pdf')) {
      throw new InvalidUploadedDocumentError();
    }
    if (input.sizeBytes > PdfUploadConstraints.maxSizeBytes) {
      throw new UploadedDocumentTooLargeError();
    }

    const textContent = await this.dependencies.textExtractor.extractText(input.content);
    const id = this.dependencies.ids.randomId();
    const filename = input.filename.trim();
    const document = {
      id,
      sessionId: input.sessionId,
      title: titleFromFilename(filename),
      filename,
      contentType: PdfUploadConstraints.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedAt: this.dependencies.clock.now(),
      documentUrl: `/api/documents/uploads/${id}/${encodeURIComponent(filename)}`,
      content: input.content,
      textContent,
    };

    await this.dependencies.repository.save(document);

    return presentUploadedDocument(document);
  }
}

export function presentUploadedDocument(document: {
  readonly id: string;
  readonly title: string;
  readonly filename: string;
  readonly sizeBytes: number;
  readonly uploadedAt: Date;
  readonly documentUrl: string;
}): UploadedDocument {
  return {
    id: document.id,
    title: document.title,
    type: 'adjunto',
    filename: document.filename,
    sizeBytes: document.sizeBytes,
    uploadedAt: document.uploadedAt.toISOString(),
    documentUrl: document.documentUrl,
  };
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.pdf$/iu, '').trim() || 'Documento adjunto';
}
