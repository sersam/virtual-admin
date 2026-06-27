import type { ChatAgent, ChatMessageResponse } from '@admin/contracts';
import { createLocalDocumentAnswer } from './localDocumentAnswer';
import { createLocalCommunityNoticeDraft } from './localCommunityNoticeDraft';
import { createLocalMeetingMinutesDraft } from './localMeetingMinutesDraft';

const intentKeywords: ReadonlyArray<{
  readonly agent: ChatAgent;
  readonly keywords: readonly string[];
}> = [
  {
    agent: 'incidencias',
    keywords: ['averia', 'fuga', 'incidencia', 'prioridad', 'reparacion', 'responsable', 'urgente'],
  },
  {
    agent: 'comunicados',
    keywords: ['aviso', 'avisar', 'comunicacion', 'comunicado', 'redacta', 'vecinos'],
  },
  {
    agent: 'actas',
    keywords: ['acta', 'actas', 'secretario'],
  },
  {
    agent: 'juntas',
    keywords: ['convocatoria', 'junta', 'orden del dia', 'reunion'],
  },
  {
    agent: 'documentos',
    keywords: [
      'contrato',
      'documento',
      'estatuto',
      'estatutos',
      'norma',
      'normas',
      'pdf',
      'piscina',
    ],
  },
];

const MIN_MEETING_MINUTES_NOTES_LENGTH = 10;
const explicitMeetingMinutesKeywords = ['acta', 'actas'] as const;
const supportingMeetingMinutesKeywords = [
  'acuerdo',
  'acuerdos',
  'notas',
  'responsable',
  'responsables',
  'tarea',
  'tareas',
] as const;

export function createLocalChatMessage(message: string): ChatMessageResponse {
  const agent = classifyLocalAgent(message);
  if (agent === 'documentos') {
    const answer = createLocalDocumentAnswer(message);
    return {
      agent,
      answer: answer.answer,
      mode: 'local-demo',
      sources: answer.sources,
    };
  }
  if (agent === 'comunicados') {
    const response = createLocalCommunityNoticeDraft(message);
    return {
      agent,
      answer: [`Asunto: ${response.draft.subject}`, '', response.draft.body].join('\n'),
      mode: 'local-demo',
      sources: [],
    };
  }
  if (agent === 'actas') {
    if (message.trim().length < MIN_MEETING_MINUTES_NOTES_LENGTH) {
      return {
        agent,
        answer: 'Necesito unas notas de al menos 10 caracteres para generar un borrador de acta.',
        mode: 'local-demo',
        sources: [],
      };
    }

    return {
      agent,
      answer: createLocalMeetingMinutesDraft(message).draft.body,
      mode: 'local-demo',
      sources: [],
    };
  }

  return {
    agent,
    answer: localAgentAnswers[agent],
    mode: 'local-demo',
    sources: [],
  };
}

function classifyLocalAgent(message: string): ChatAgent {
  const normalizedMessage = ` ${normalize(message)} `;
  if (isMeetingMinutesRequest(normalizedMessage)) {
    return 'actas';
  }

  const match = intentKeywords.find(({ keywords }) =>
    keywords.some((keyword) => normalizedMessage.includes(` ${keyword} `)),
  );

  return match?.agent ?? 'general';
}

function isMeetingMinutesRequest(normalizedMessage: string): boolean {
  if (
    explicitMeetingMinutesKeywords.some((keyword) => includesKeyword(normalizedMessage, keyword))
  ) {
    return true;
  }

  return (
    supportingMeetingMinutesKeywords.filter((keyword) =>
      includesKeyword(normalizedMessage, keyword),
    ).length >= 2
  );
}

function includesKeyword(normalizedMessage: string, keyword: string): boolean {
  return normalizedMessage.includes(` ${keyword} `);
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, ' ')
    .trim();
}

const localAgentAnswers: Record<
  Exclude<ChatAgent, 'documentos' | 'comunicados' | 'actas'>,
  string
> = {
  general:
    'Soy el coordinador local. Puedo derivar peticiones sobre documentos, comunicados, actas, incidencias y juntas.',
  incidencias:
    'Soy el agente de incidencias. En esta demo local puedo clasificar tu petición; el registro completo llegará en la US-007.',
  juntas:
    'Soy el agente de juntas. En esta demo local puedo clasificar tu petición; la preparación completa llegará en la US-008.',
};
