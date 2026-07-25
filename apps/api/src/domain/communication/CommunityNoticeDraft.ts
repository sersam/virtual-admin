export interface CommunityNoticeDraftContent {
  readonly subject: string;
  readonly body: string;
}

export type CommunityNoticeType = 'informativo' | 'recordatorio' | 'urgente';
export type CommunityNoticeAudience = 'todos' | 'propietarios' | 'residentes';
export type CommunityNoticeTone = 'formal' | 'cercano' | 'directo';

export interface CommunityNoticeDraftInput {
  readonly subject: string;
  readonly type: CommunityNoticeType;
  readonly audience: CommunityNoticeAudience;
  readonly tone: CommunityNoticeTone;
}

const DEFAULT_SUBJECT = 'Aviso de la comunidad';
const GENERIC_REQUEST_PATTERN =
  /\b(?:ayuda|aviso|avisar|comunicacion|comunicado|redacta|redactar)\b/u;
const TOPIC_MARKERS = ['sobre ', 'de la ', 'de los ', 'de las ', 'del '] as const;

export function createCommunityNoticeDraft(
  input: CommunityNoticeDraftInput,
): CommunityNoticeDraftContent {
  const subject = input.subject.trim();
  const body = [
    getGreeting(input.audience),
    '',
    `${getPurpose(input.type, subject)} Rogamos que tengan en cuenta este aviso y que sigan las indicaciones de la administración de la comunidad.`,
    '',
    getClosing(input.tone),
    '',
    'La administración de la comunidad',
  ].join('\n');

  return { subject, body };
}

export function buildCommunityNoticeInputFromText(message: string): CommunityNoticeDraftInput {
  return {
    subject: getSubjectFromMessage(message),
    type: 'informativo',
    audience: 'todos',
    tone: 'formal',
  };
}

export function draftCommunityNotice(message: string): string {
  const draft = createCommunityNoticeDraft(buildCommunityNoticeInputFromText(message));

  return [`Asunto: ${draft.subject}`, '', draft.body].join('\n');
}

function getGreeting(audience: CommunityNoticeAudience): string {
  if (audience === 'propietarios') return 'Estimados propietarios:';
  if (audience === 'residentes') return 'Estimados residentes:';

  return 'Estimados vecinos:';
}

function getPurpose(type: CommunityNoticeType, subject: string): string {
  if (type === 'recordatorio') return `Les recordamos ${subject}.`;
  if (type === 'urgente') return `Les informamos con carácter urgente sobre ${subject}.`;

  return `Les informamos sobre ${subject}.`;
}

function getClosing(tone: CommunityNoticeTone): string {
  if (tone === 'cercano') {
    return 'Gracias por ayudarnos a mantener una convivencia agradable.';
  }
  if (tone === 'directo') {
    return 'Por favor, revisen este aviso y actúen en consecuencia.';
  }

  return 'Gracias por vuestra colaboración.';
}

function getSubjectFromMessage(message: string): string {
  const cleanMessage = trimTopic(message);
  const topic = findExplicitTopic(cleanMessage) ?? findDirectTopic(cleanMessage);

  return topic ? toSentenceCase(removeLeadingArticle(topic)) : DEFAULT_SUBJECT;
}

function findExplicitTopic(message: string): string | undefined {
  const lowerCaseMessage = message.toLocaleLowerCase('es');

  for (const marker of TOPIC_MARKERS) {
    const markerIndex = lowerCaseMessage.indexOf(marker);
    if (markerIndex >= 0) {
      return trimTopic(message.slice(markerIndex + marker.length));
    }
  }

  return undefined;
}

function findDirectTopic(message: string): string | undefined {
  const normalized = normalize(message);

  return normalized && !GENERIC_REQUEST_PATTERN.test(normalized) ? message : undefined;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, ' ')
    .trim();
}

function removeLeadingArticle(text: string): string {
  return text.replace(/^(el|la|los|las)\s+/iu, '');
}

function toSentenceCase(text: string): string {
  return `${text.slice(0, 1).toLocaleUpperCase('es')}${text.slice(1)}`;
}

function trimTopic(text: string): string {
  return text
    .trim()
    .replace(/[.!?¡¿]+$/u, '')
    .trim();
}
