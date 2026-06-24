import type { CommunityNoticeDraftResponse } from '@admin/contracts';

export function createLocalCommunityNoticeDraft(message: string): CommunityNoticeDraftResponse {
  const topic = extractTopic(message);
  const topicWithoutArticle = topic.replace(/^(el|la|los|las)\s+/u, '');
  const subject = `${topicWithoutArticle.charAt(0).toUpperCase()}${topicWithoutArticle.slice(1)}`;
  const body = [
    'Estimados vecinos:',
    '',
    `Les informamos sobre ${topic}. Rogamos que tengan en cuenta este aviso y que sigan las indicaciones de la administración de la comunidad.`,
    '',
    'Gracias por vuestra colaboración.',
    '',
    'La administración de la comunidad',
  ].join('\n');

  return {
    draft: { subject, body },
    mode: 'deterministic-demo',
  };
}

function extractTopic(message: string): string {
  const normalized = normalize(message);
  const match = /(?:sobre|del|de la|de los|de las) (.+)$/u.exec(normalized);
  const topic = match?.[1]?.replaceAll(/\.$/gu, '').trim();

  return topic && topic.length > 0 ? topic : 'el aviso de la comunidad';
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, ' ')
    .trim();
}
