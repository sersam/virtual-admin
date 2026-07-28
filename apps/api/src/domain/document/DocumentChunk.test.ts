import { describe, expect, it } from 'vitest';
import type { CommunityDocument } from './CommunityDocument.js';
import {
  chunkCommunityDocument,
  DOCUMENT_CHUNKING_VERSION,
  fingerprintCommunityDocument,
  normalizeDocumentContent,
} from './DocumentChunk.js';

const baseDocument: CommunityDocument = {
  id: 'doc-1',
  title: 'Normas de piscina',
  type: 'normas',
  section: 'Piscina',
  content: 'La piscina abre de 10:00 a 21:00.   No se permite vidrio.\nHay socorrista.',
  documentUrl: '/documents/normas-zonas-comunes.pdf',
};

describe('DocumentChunk', () => {
  it('normaliza contenido documental de forma estable', () => {
    expect(normalizeDocumentContent('  Texto\tcon\nespacios   repetidos  ')).toBe(
      'Texto con espacios repetidos',
    );
  });

  it('crea un chunk unico para documentos cortos', () => {
    expect(chunkCommunityDocument(baseDocument)).toEqual([
      {
        id: 'doc-1:0',
        document: baseDocument,
        content: 'La piscina abre de 10:00 a 21:00. No se permite vidrio. Hay socorrista.',
        index: 0,
      },
    ]);
  });

  it('crea chunks deterministas con limite y solape', () => {
    const words = Array.from({ length: 260 }, (_, index) => `palabra${index}`);
    const document = { ...baseDocument, content: words.join(' ') };

    const chunks = chunkCommunityDocument(document);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks).toEqual(chunkCommunityDocument(document));
    expect(chunks.every((chunk) => chunk.content.length <= 1200)).toBe(true);
    expect(chunks[1]!.content.startsWith('palabra')).toBe(true);
    expect(
      chunks[0]!.content
        .slice(-200)
        .split(' ')
        .some((word) => chunks[1]!.content.startsWith(word)),
    ).toBe(true);
  });

  it('no genera chunks para texto vacio tras normalizar', () => {
    expect(chunkCommunityDocument({ ...baseDocument, content: ' \n\t ' })).toEqual([]);
  });

  it('mantiene caracteres Unicode del documento', () => {
    const [chunk] = chunkCommunityDocument({
      ...baseDocument,
      content: 'Clausula: se revisara el jardin comunitario y el ascensor numero 2.',
    });

    expect(chunk?.content).toContain('Clausula');
  });

  it('calcula fingerprints estables y sensibles al modelo, version y contenido', () => {
    const fingerprint = fingerprintCommunityDocument(baseDocument, {
      chunkingVersion: DOCUMENT_CHUNKING_VERSION,
      embeddingModel: 'text-embedding-3-small',
    });

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(
      fingerprintCommunityDocument(baseDocument, {
        chunkingVersion: DOCUMENT_CHUNKING_VERSION,
        embeddingModel: 'text-embedding-3-small',
      }),
    ).toBe(fingerprint);
    expect(
      fingerprintCommunityDocument(
        { ...baseDocument, content: `${baseDocument.content} Cambio.` },
        {
          chunkingVersion: DOCUMENT_CHUNKING_VERSION,
          embeddingModel: 'text-embedding-3-small',
        },
      ),
    ).not.toBe(fingerprint);
    expect(
      fingerprintCommunityDocument(baseDocument, {
        chunkingVersion: DOCUMENT_CHUNKING_VERSION,
        embeddingModel: 'otro-modelo',
      }),
    ).not.toBe(fingerprint);
  });
});
