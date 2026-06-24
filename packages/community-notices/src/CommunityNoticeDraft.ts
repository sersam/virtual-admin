export interface CommunityNoticeDraftContent {
  readonly subject: string;
  readonly body: string;
}

export function createCommunityNoticeDraft(message: string): CommunityNoticeDraftContent {
  const topic = extractTopic(message);
  const subject = toSentenceCase(removeLeadingArticle(topic));
  const body = [
    'Estimados vecinos:',
    '',
    `Les informamos sobre ${topic}. Rogamos que tengan en cuenta este aviso y que sigan las indicaciones de la administración de la comunidad.`,
    '',
    'Gracias por vuestra colaboración.',
    '',
    'La administración de la comunidad',
  ].join('\n');

  return { subject, body };
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

function toSentenceCase(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function removeLeadingArticle(text: string): string {
  return text.replace(/^(el|la|los|las)\s+/u, '');
}
