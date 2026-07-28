import type {
  ChatAgent,
  ChatMessageResponse,
  ChatProvider,
  DocumentQueryResponse,
  DocumentSource,
  MeetingAgendaDraftResponse,
  MeetingMinutesDraftResponse,
} from '@admin/contracts';
import { ChatMessageResponseSchema } from '@admin/contracts';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { ChatIntentClassifier } from '../../application/ports/ChatIntentClassifier.js';
import type { ChatWorkflow, ChatWorkflowContext } from '../../application/ports/ChatWorkflow.js';
import type { CommunityNoticeDraftResult } from '../../application/ports/CommunityNoticeGenerator.js';
import type { CreateIncidentResult } from '../../application/use-cases/CreateIncident.js';
import {
  buildCommunityNoticeInputFromText,
  type CommunityNoticeDraftInput,
} from '../../domain/communication/CommunityNoticeDraft.js';
import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';

interface DocumentAnswerer {
  execute(question: string, context?: ChatWorkflowContext): Promise<DocumentQueryResponse>;
}

interface IncidentCreator {
  execute(input: {
    readonly description: string;
    readonly sessionId: string;
  }): Promise<CreateIncidentResult>;
}

interface CommunityNoticeDrafter {
  execute(input: CommunityNoticeDraftInput): Promise<CommunityNoticeDraftResult>;
}

interface MeetingMinutesDrafter {
  execute(
    notes: string,
    options?: { readonly sessionId?: string },
  ): Promise<MeetingMinutesDraftResponse>;
}

interface MeetingAgendaDrafter {
  execute(input: { readonly sessionId: string }): Promise<MeetingAgendaDraftResponse>;
}

interface LangGraphChatWorkflowDependencies {
  readonly chatIntentClassifier: ChatIntentClassifier;
  readonly communityNoticeDrafter: CommunityNoticeDrafter;
  readonly documentAnswerer: DocumentAnswerer;
  readonly incidentCreator: IncidentCreator;
  readonly meetingAgendaDrafter: MeetingAgendaDrafter;
  readonly meetingMinutesDrafter: MeetingMinutesDrafter;
}

interface ChatGraph {
  invoke(input: { readonly message: string; readonly sessionId?: string }): Promise<{
    readonly agent?: ChatAgent;
    readonly answer?: string;
    readonly provider?: ChatProvider;
    readonly sources?: DocumentSource[];
  }>;
}

const ChatState = Annotation.Root({
  agent: Annotation<ChatAgent | undefined>(),
  answer: Annotation<string | undefined>(),
  message: Annotation<string>(),
  provider: Annotation<ChatProvider | undefined>(),
  sessionId: Annotation<string | undefined>(),
  sources: Annotation<DocumentSource[]>({
    reducer: (_current, next) => next,
    default: () => [],
  }),
});

export class LangGraphChatWorkflow implements ChatWorkflow {
  private readonly graph: ChatGraph;

  constructor(private readonly dependencies: LangGraphChatWorkflowDependencies) {
    this.graph = new StateGraph(ChatState)
      .addNode('classify', async (state) =>
        this.dependencies.chatIntentClassifier.classify(state.message),
      )
      .addNode('documentos', async (state) => this.answerDocuments(state.message, state.sessionId))
      .addNode('comunicados', async (state) => this.answerCommunityNotice(state.message))
      .addNode('actas', async (state) => this.answerMeetingMinutes(state.message, state.sessionId))
      .addNode('incidencias', async (state) => this.answerIncident(state.message, state.sessionId))
      .addNode('juntas', async (state) => this.answerMeetingAgenda(state.sessionId))
      .addNode('general', async () => this.answerGeneral())
      .addEdge(START, 'classify')
      .addConditionalEdges('classify', (state) => state.agent ?? 'general', {
        actas: 'actas',
        comunicados: 'comunicados',
        documentos: 'documentos',
        general: 'general',
        incidencias: 'incidencias',
        juntas: 'juntas',
      })
      .addEdge('documentos', END)
      .addEdge('comunicados', END)
      .addEdge('actas', END)
      .addEdge('incidencias', END)
      .addEdge('juntas', END)
      .addEdge('general', END)
      .compile() as ChatGraph;
  }

  async run(message: string, context: ChatWorkflowContext = {}): Promise<ChatMessageResponse> {
    const state = await this.graph.invoke({ message, sessionId: context.sessionId });

    return ChatMessageResponseSchema.parse({
      agent: state.agent ?? 'general',
      answer: state.answer,
      mode: 'langgraph',
      provider: state.provider ?? 'deterministic-demo',
      sources: state.sources ?? [],
    });
  }

  private async answerDocuments(
    message: string,
    sessionId: string | undefined,
  ): Promise<Pick<ChatMessageResponse, 'answer' | 'sources'>> {
    const response = await this.dependencies.documentAnswerer.execute(message, { sessionId });
    return { answer: response.answer, sources: response.sources };
  }

  private async answerCommunityNotice(
    message: string,
  ): Promise<Pick<ChatMessageResponse, 'answer' | 'sources'>> {
    const response = await this.dependencies.communityNoticeDrafter.execute(
      buildCommunityNoticeInputFromText(message),
    );
    return { answer: formatCommunityNoticeAnswer(response), sources: [] };
  }

  private async answerMeetingMinutes(
    message: string,
    sessionId: string | undefined,
  ): Promise<Pick<ChatMessageResponse, 'answer' | 'sources'>> {
    const response = await this.dependencies.meetingMinutesDrafter.execute(message, {
      sessionId,
    });
    return { answer: response.draft.body, sources: [] };
  }

  private async answerIncident(
    message: string,
    sessionId: string | undefined,
  ): Promise<Pick<ChatMessageResponse, 'answer' | 'sources'>> {
    if (!sessionId) {
      return {
        answer: 'No se pudo registrar la incidencia porque no hay una sesión activa.',
        sources: [],
      };
    }

    const response = await this.dependencies.incidentCreator.execute({
      description: message,
      sessionId,
    });
    return { answer: formatIncidentAnswer(response.incident), sources: [] };
  }

  private async answerMeetingAgenda(
    sessionId: string | undefined,
  ): Promise<Pick<ChatMessageResponse, 'answer' | 'sources'>> {
    if (!sessionId) {
      return {
        answer: 'No se pudo preparar el orden del día porque no hay una sesión activa.',
        sources: [],
      };
    }

    const response = await this.dependencies.meetingAgendaDrafter.execute({ sessionId });
    return { answer: response.draft.body, sources: [] };
  }

  private answerGeneral(): Pick<ChatMessageResponse, 'answer' | 'sources'> {
    return {
      answer: futureAgentAnswer.general,
      sources: [],
    };
  }
}

const futureAgentAnswer: Record<
  Exclude<ChatAgent, 'documentos' | 'comunicados' | 'actas' | 'incidencias' | 'juntas'>,
  string
> = {
  general:
    'Soy el coordinador de la demo. Puedo derivar peticiones sobre documentos, comunicados, actas, incidencias y preparación de juntas.',
};

function formatCommunityNoticeAnswer(response: CommunityNoticeDraftResult): string {
  return [`Asunto: ${response.draft.subject}`, '', response.draft.body].join('\n');
}

function formatIncidentAnswer(incident: CommunityIncident): string {
  return [
    'Incidencia registrada.',
    `Categoría: ${capitalize(incident.type)}`,
    `Prioridad: ${capitalize(incident.priority)}`,
    `Responsable sugerido: ${incident.suggestedResponsible}`,
  ].join('\n');
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
