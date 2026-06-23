import type { DocumentRetriever } from '../../application/ports/DocumentRetriever.js';
import type {
  CommunityDocument,
  RetrievedDocument,
} from '../../domain/document/CommunityDocument.js';

const STOP_WORDS = new Set([
  'a',
  'al',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'los',
  'por',
  'que',
  'se',
  'un',
  'una',
  'y',
]);

export class LexicalDocumentRetriever implements DocumentRetriever {
  constructor(private readonly documents: readonly CommunityDocument[]) {}

  async retrieve(question: string, maxSources: number): Promise<RetrievedDocument[]> {
    const terms = tokenize(question);
    if (terms.length === 0) return [];

    return this.documents
      .map((document) => ({ ...document, score: scoreDocument(document, terms) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, maxSources);
  }
}

function scoreDocument(document: CommunityDocument, terms: readonly string[]): number {
  const searchableText = tokenize(
    `${document.title} ${document.type} ${document.section} ${document.content}`,
  );
  const matches = terms.filter((term) => searchableText.includes(term)).length;

  return roundScore(matches / terms.length);
}

function tokenize(text: string): string[] {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}
