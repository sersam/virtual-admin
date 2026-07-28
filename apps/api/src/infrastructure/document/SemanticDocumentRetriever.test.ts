import { describe, expect, it } from 'vitest';
import type {
  DocumentChunkRepository,
  IndexedDocumentVersion,
  RetrievedDocumentChunk,
  StoredDocumentChunk,
} from '../../application/ports/DocumentChunkRepository.js';
import type { EmbeddingProvider } from '../../application/ports/EmbeddingProvider.js';
import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import type { CommunityDocument } from '../../domain/document/CommunityDocument.js';
import type { UploadedCommunityDocument } from '../../domain/document/UploadedCommunityDocument.js';
import {
  DOCUMENT_CHUNKING_VERSION,
  fingerprintCommunityDocument,
} from '../../domain/document/DocumentChunk.js';
import { SemanticDocumentRetriever } from './SemanticDocumentRetriever.js';

const baseDocuments: CommunityDocument[] = [
  {
    content: 'La piscina abre de 10:00 a 21:00 durante la temporada de verano.',
    documentUrl: '/documents/normas-zonas-comunes.pdf',
    id: 'normas-piscina',
    section: 'Piscina',
    title: 'Normas de zonas comunes',
    type: 'normas',
  },
  {
    content: 'El ascensor del portal B requiere mantenimiento trimestral.',
    documentUrl: '/documents/contrato-ascensor.pdf',
    id: 'contrato-ascensor',
    section: 'Ascensor',
    title: 'Contrato ascensor',
    type: 'contrato',
  },
];

describe('SemanticDocumentRetriever', () => {
  it('reconcilia documentos pendientes y devuelve top 3 distinto con umbral', async () => {
    const embeddings = new RecordingEmbeddingProvider();
    const chunks = new RecordingChunkRepository([
      retrievedChunk({ documentId: 'normas-piscina', score: 0.94 }),
      retrievedChunk({ documentId: 'normas-piscina', score: 0.9, content: 'Chunk duplicado' }),
      retrievedChunk({
        documentId: 'pdf-0001',
        score: 0.82,
        title: 'Acta subida',
        type: 'adjunto',
      }),
      retrievedChunk({ documentId: 'contrato-ascensor', score: 0.49 }),
    ]);
    const retriever = new SemanticDocumentRetriever({
      chunkRepository: chunks,
      embeddingProvider: embeddings,
      documents: baseDocuments,
      uploadedDocumentRepository: new FakeUploadedDocumentRepository([uploadedDocument()]),
    });

    const results = await retriever.retrieve('horario piscina ascensor', 3, {
      sessionId: 'session-1',
    });

    expect(retriever.mode).toBe('semantic-pgvector');
    expect(embeddings.inputs[0]).toBe('horario piscina ascensor');
    expect(embeddings.inputs).toEqual([
      'horario piscina ascensor',
      'La piscina abre de 10:00 a 21:00 durante la temporada de verano.',
      'El ascensor del portal B requiere mantenimiento trimestral.',
      'El acta subida menciona el contrato del ascensor.',
    ]);
    expect(chunks.replacements).toHaveLength(3);
    expect(chunks.replacements[0]).toMatchObject({
      documentId: 'normas-piscina',
      embeddingModel: 'test-embedding-model',
    });
    expect(chunks.replacements[0]).not.toHaveProperty('sessionId');
    expect(chunks.replacements[2]).toMatchObject({
      documentId: 'pdf-0001',
      sessionId: 'session-1',
    });
    expect(chunks.replacements[0]?.chunks[0]).toMatchObject({
      documentFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      embeddingModel: 'test-embedding-model',
      section: 'Piscina',
    });
    expect(chunks.listParams).toEqual([
      { embeddingModel: 'test-embedding-model', sessionId: 'session-1' },
    ]);
    expect(chunks.searchParams).toEqual([
      {
        embedding: [0.1, 0.2, 0.3],
        embeddingModel: 'test-embedding-model',
        limit: 30,
        sessionId: 'session-1',
      },
    ]);
    expect(results).toEqual([
      expect.objectContaining({ id: 'normas-piscina', score: 0.94 }),
      expect.objectContaining({ id: 'pdf-0001', score: 0.82, type: 'adjunto' }),
    ]);
  });

  it('no reindexa documentos con fingerprint vigente', async () => {
    const embeddings = new RecordingEmbeddingProvider();
    const documentFingerprint = fingerprintCommunityDocument(baseDocuments[0]!, {
      chunkingVersion: DOCUMENT_CHUNKING_VERSION,
      embeddingModel: 'test-embedding-model',
    });
    const chunks = new RecordingChunkRepository(
      [],
      [
        {
          documentFingerprint,
          documentId: 'normas-piscina',
          embeddingModel: 'test-embedding-model',
        },
      ],
    );
    const retriever = new SemanticDocumentRetriever({
      chunkRepository: chunks,
      embeddingProvider: embeddings,
      documents: [baseDocuments[0]!],
      uploadedDocumentRepository: new FakeUploadedDocumentRepository([]),
    });

    await retriever.retrieve('horario piscina', 3);

    expect(chunks.replacements).toEqual([]);
    expect(embeddings.inputs).toEqual(['horario piscina']);
  });

  it('propaga fallos de embeddings sin buscar vecinos', async () => {
    const chunks = new RecordingChunkRepository([]);
    const retriever = new SemanticDocumentRetriever({
      chunkRepository: chunks,
      embeddingProvider: new RecordingEmbeddingProvider(new Error('embedding failure')),
      documents: [baseDocuments[0]!],
      uploadedDocumentRepository: new FakeUploadedDocumentRepository([]),
    });

    await expect(retriever.retrieve('horario piscina', 3)).rejects.toThrow('embedding failure');
    expect(chunks.searchParams).toEqual([]);
  });

  it('propaga fallos de persistencia vectorial sin buscar vecinos', async () => {
    const chunks = new RecordingChunkRepository([], [], new Error('replace failure'));
    const retriever = new SemanticDocumentRetriever({
      chunkRepository: chunks,
      embeddingProvider: new RecordingEmbeddingProvider(),
      documents: [baseDocuments[0]!],
      uploadedDocumentRepository: new FakeUploadedDocumentRepository([]),
    });

    await expect(retriever.retrieve('horario piscina', 3)).rejects.toThrow('replace failure');
    expect(chunks.searchParams).toEqual([]);
  });
});

class RecordingEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 3;
  readonly inputs: string[] = [];
  readonly model = 'test-embedding-model';

  constructor(private readonly failure?: Error) {}

  async embed(texts: readonly string[]): Promise<{
    readonly inputTokens: number;
    readonly vectors: readonly (readonly number[])[];
  }> {
    if (this.failure) throw this.failure;

    this.inputs.push(...texts);
    return {
      inputTokens: texts.length,
      vectors: texts.map((_, index) => [0.1 + index, 0.2 + index, 0.3 + index]),
    };
  }
}

class RecordingChunkRepository implements DocumentChunkRepository {
  readonly listParams: {
    readonly embeddingModel: string;
    readonly sessionId?: string;
  }[] = [];
  readonly replacements: {
    readonly chunks: readonly StoredDocumentChunk[];
    readonly documentFingerprint: string;
    readonly documentId: string;
    readonly embeddingModel: string;
    readonly sessionId?: string;
  }[] = [];
  readonly searchParams: {
    readonly embedding: readonly number[];
    readonly embeddingModel: string;
    readonly limit: number;
    readonly sessionId?: string;
  }[] = [];

  constructor(
    private readonly searchResults: readonly RetrievedDocumentChunk[],
    private readonly indexedDocuments: readonly IndexedDocumentVersion[] = [],
    private readonly replaceFailure?: Error,
  ) {}

  async listIndexedDocuments(params: {
    readonly embeddingModel: string;
    readonly sessionId?: string;
  }): Promise<IndexedDocumentVersion[]> {
    this.listParams.push(params);
    return [...this.indexedDocuments];
  }

  async replaceDocumentChunks(params: {
    readonly chunks: readonly StoredDocumentChunk[];
    readonly documentFingerprint: string;
    readonly documentId: string;
    readonly embeddingModel: string;
    readonly sessionId?: string;
  }): Promise<void> {
    if (this.replaceFailure) throw this.replaceFailure;

    this.replacements.push(params);
  }

  async searchNearest(params: {
    readonly embedding: readonly number[];
    readonly embeddingModel: string;
    readonly limit: number;
    readonly sessionId?: string;
  }): Promise<RetrievedDocumentChunk[]> {
    this.searchParams.push(params);
    return [...this.searchResults];
  }
}

class FakeUploadedDocumentRepository implements UploadedDocumentRepository {
  constructor(private readonly documents: readonly UploadedCommunityDocument[]) {}

  async listBySession(sessionId: string): Promise<UploadedCommunityDocument[]> {
    return this.documents.filter((document) => document.sessionId === sessionId);
  }

  async save(): Promise<void> {
    throw new Error('Not implemented');
  }
}

function uploadedDocument(): UploadedCommunityDocument {
  return {
    content: Buffer.from('%PDF-1.4'),
    contentType: 'application/pdf',
    documentUrl: '/api/documents/uploads/pdf-0001/acta-subida.pdf',
    filename: 'acta-subida.pdf',
    id: 'pdf-0001',
    sessionId: 'session-1',
    sizeBytes: 8,
    textContent: 'El acta subida menciona el contrato del ascensor.',
    title: 'Acta subida',
    uploadedAt: new Date('2026-07-01T10:00:00.000Z'),
  };
}

function retrievedChunk(overrides: Partial<RetrievedDocumentChunk>): RetrievedDocumentChunk {
  return {
    chunkIndex: 0,
    content: 'La piscina abre de 10:00 a 21:00.',
    documentId: 'normas-piscina',
    documentUrl: '/documents/normas-zonas-comunes.pdf',
    score: 0.9,
    section: 'Piscina',
    title: 'Normas de zonas comunes',
    type: 'normas',
    ...overrides,
  };
}
