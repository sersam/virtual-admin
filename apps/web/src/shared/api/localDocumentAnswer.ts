import {
  demoCommunityDocuments,
  type DemoCommunityDocument,
  type DocumentQueryResponse,
  type DocumentSource,
} from '@admin/contracts';

const localSourceIds = new Set(['normas-piscina', 'acta-ascensor', 'normas-ruido']);

const localSources: DocumentSource[] = demoCommunityDocuments
  .filter(({ id }) => localSourceIds.has(id))
  .map(toLocalSource);

const stopWords = new Set(['cual', 'que', 'del', 'las', 'los', 'una', 'por', 'con', 'para']);

export function createLocalDocumentAnswer(question: string): DocumentQueryResponse {
  const normalizedQuestion = normalize(question);
  const sources = localSources
    .map((source) => ({ ...source, score: scoreSource(source, normalizedQuestion) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);

  if (sources.length === 0) {
    return {
      answer:
        'No he encontrado fuentes suficientes en la documentación local de demostración. Prueba con piscina, ascensor o ruidos.',
      mode: 'local-demo',
      sources: [],
    };
  }

  return {
    answer: `Según la documentación local, ${sources[0]!.excerpt}`,
    mode: 'local-demo',
    sources: sources.slice(0, 3),
  };
}

function scoreSource(source: DocumentSource, normalizedQuestion: string): number {
  const haystack = normalize(`${source.title} ${source.section} ${source.excerpt}`);
  const terms = normalizedQuestion
    .split(' ')
    .filter((term) => term.length > 2 && !stopWords.has(term));
  const matches = terms.filter((term) => haystack.includes(term)).length;

  return terms.length === 0 ? 0 : Math.round((matches / terms.length) * 100) / 100;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, ' ')
    .trim();
}

function toLocalSource(document: DemoCommunityDocument): DocumentSource {
  return {
    id: document.id,
    title: document.title,
    type: document.type,
    section: document.section,
    documentUrl: document.documentUrl,
    excerpt: document.content,
    score: 0,
  };
}
