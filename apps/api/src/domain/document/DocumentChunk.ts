import { createHash } from 'node:crypto';
import type { CommunityDocument } from './CommunityDocument.js';

export const DOCUMENT_CHUNKING_VERSION = 'document-chunking.v1';
export const DOCUMENT_CHUNK_MAX_CHARACTERS = 1_200;
export const DOCUMENT_CHUNK_OVERLAP_CHARACTERS = 200;

export interface DocumentChunk {
  readonly content: string;
  readonly document: CommunityDocument;
  readonly id: string;
  readonly index: number;
}

interface FingerprintOptions {
  readonly chunkingVersion: string;
  readonly embeddingModel: string;
}

export function normalizeDocumentContent(content: string): string {
  return content.replaceAll(/\s+/g, ' ').trim();
}

export function chunkCommunityDocument(document: CommunityDocument): DocumentChunk[] {
  const content = normalizeDocumentContent(document.content);
  if (!content) return [];

  const chunks: DocumentChunk[] = [];
  let start = 0;

  while (start < content.length) {
    const end = findChunkEnd(content, start);
    chunks.push({
      content: content.slice(start, end).trim(),
      document,
      id: `${document.id}:${chunks.length}`,
      index: chunks.length,
    });
    if (end >= content.length) break;
    start = findNextStart(content, end);
  }

  return chunks;
}

export function fingerprintCommunityDocument(
  document: CommunityDocument,
  options: FingerprintOptions,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        chunkingVersion: options.chunkingVersion,
        content: normalizeDocumentContent(document.content),
        documentUrl: document.documentUrl,
        embeddingModel: options.embeddingModel,
        id: document.id,
        section: document.section,
        title: document.title,
        type: document.type,
      }),
    )
    .digest('hex');
}

function findChunkEnd(content: string, start: number): number {
  const hardEnd = Math.min(start + DOCUMENT_CHUNK_MAX_CHARACTERS, content.length);
  if (hardEnd === content.length) return hardEnd;

  const boundary = content.lastIndexOf(' ', hardEnd);
  if (boundary <= start) return hardEnd;
  return boundary;
}

function findNextStart(content: string, previousEnd: number): number {
  const overlapStart = Math.max(0, previousEnd - DOCUMENT_CHUNK_OVERLAP_CHARACTERS);
  const boundary = content.indexOf(' ', overlapStart);
  if (boundary < 0 || boundary >= previousEnd) return overlapStart;
  return boundary + 1;
}
