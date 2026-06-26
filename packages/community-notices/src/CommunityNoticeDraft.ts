export interface CommunityNoticeDraftContent {
  readonly subject: string;
  readonly body: string;
}

const DEFAULT_TOPIC = 'el aviso de la comunidad';
const TOPIC_MARKER_PATTERN = /(?:sobre|del|de la|de los|de las)\s+(.+)$/iu;
const GENERIC_REQUEST_PATTERN =
  /\b(?:ayuda|aviso|avisar|comunicacion|comunicado|redacta|redactar)\b/u;

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
  const trimmedMessage = trimTopic(message);
  const markedTopic = TOPIC_MARKER_PATTERN.exec(trimmedMessage)?.[1];
  const topic = markedTopic ? trimTopic(markedTopic) : undefined;

  if (topic && topic.length > 0) return topic;

  const normalized = normalize(trimmedMessage);

  return normalized && !GENERIC_REQUEST_PATTERN.test(normalized) ? trimmedMessage : DEFAULT_TOPIC;
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
  return text.replace(/^(el|la|los|las)\s+/iu, '');
}

function trimTopic(text: string): string {
  return text.trim().replace(/[.\s]+$/u, '');
}
