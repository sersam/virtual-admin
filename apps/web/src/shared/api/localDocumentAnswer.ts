import type { DocumentQueryResponse, DocumentSource } from '@admin/contracts';

const localSources: DocumentSource[] = [
  {
    id: 'normas-piscina',
    title: 'Normas de uso de zonas comunes',
    type: 'normas',
    section: 'Piscina',
    documentUrl: '/documents/normas-zonas-comunes.pdf',
    excerpt:
      'La piscina comunitaria abre de 10:00 a 21:00 durante la temporada de verano. Los menores de 12 años deben estar acompañados por una persona adulta.',
    score: 0.9,
  },
  {
    id: 'acta-ascensor',
    title: 'Acta ordinaria de marzo de 2026',
    type: 'acta',
    section: 'Ascensor portal B',
    documentUrl: '/documents/acta-marzo-2026.pdf',
    excerpt:
      'La junta aprueba solicitar tres presupuestos para renovar el cuadro de maniobra del ascensor del portal B.',
    score: 0.82,
  },
  {
    id: 'normas-ruido',
    title: 'Normas de convivencia',
    type: 'normas',
    section: 'Ruidos y descanso',
    documentUrl: '/documents/normas-convivencia.pdf',
    excerpt: 'No se permiten obras ni actividades ruidosas entre las 22:00 y las 8:00.',
    score: 0.78,
  },
];

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
