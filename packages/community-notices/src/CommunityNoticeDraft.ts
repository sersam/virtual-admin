export interface CommunityNoticeDraftContent {
  readonly subject: string;
  readonly body: string;
}

const DEFAULT_TOPIC = 'el aviso de la comunidad';
const TOPIC_MARKERS = ['sobre ', 'de la ', 'de los ', 'de las ', 'del '] as const;
const TRAILING_TOPIC_PUNCTUATION = new Set(['.', '?', '!', '¡', '¿']);
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
  const topicStart = findTopicStart(trimmedMessage);
  const topic = topicStart === undefined ? undefined : trimTopic(trimmedMessage.slice(topicStart));

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

function findTopicStart(text: string): number | undefined {
  const lowerCaseText = text.toLocaleLowerCase('es');

  for (const marker of TOPIC_MARKERS) {
    let markerIndex = lowerCaseText.indexOf(marker);

    while (markerIndex >= 0) {
      if (isTopicMarkerBoundary(lowerCaseText, markerIndex)) {
        return markerIndex + marker.length;
      }

      markerIndex = lowerCaseText.indexOf(marker, markerIndex + 1);
    }
  }

  return undefined;
}

function isTopicMarkerBoundary(text: string, markerIndex: number): boolean {
  if (markerIndex === 0) return true;

  const previousCharacter = text.codePointAt(markerIndex - 1);

  return previousCharacter === undefined || !isAsciiLetterOrDigit(previousCharacter);
}

function isAsciiLetterOrDigit(characterCode: number): boolean {
  return (
    (characterCode >= 48 && characterCode <= 57) || (characterCode >= 97 && characterCode <= 122)
  );
}

function trimTopic(text: string): string {
  let endIndex = text.trimEnd().length;

  while (endIndex > 0 && TRAILING_TOPIC_PUNCTUATION.has(text[endIndex - 1] ?? '')) {
    endIndex -= 1;
  }

  return text.slice(0, endIndex).trim();
}
