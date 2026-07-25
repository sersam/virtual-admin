import type {
  ChatAgent,
  ChatMessageResponse,
  DocumentQueryResponse,
  DocumentSource,
  MeetingAgendaDraftResponse,
  MeetingMinutesDraftResponse,
} from '@admin/contracts';
import { ChatMessageResponseSchema } from '@admin/contracts';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { ChatWorkflow, ChatWorkflowContext } from '../../application/ports/ChatWorkflow.js';
import type { CommunityNoticeDraftResult } from '../../application/ports/CommunityNoticeGenerator.js';
import type { CreateIncidentResult } from '../../application/use-cases/CreateIncident.js';
import { classifyIntent } from '../../domain/agent/IntentClassifier.js';
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
  readonly documentAnswerer: DocumentAnswerer;
  readonly communityNoticeDrafter: CommunityNoticeDrafter;
  readonly incidentCreator: IncidentCreator;
  readonly meetingAgendaDrafter: MeetingAgendaDrafter;
  readonly meetingMinutesDrafter: MeetingMinutesDrafter;
}

interface ChatGraph {
  invoke(input: { readonly message: string; readonly sessionId?: string }): Promise<{
    readonly agent?: ChatAgent;
    readonly answer?: string;
    readonly sources?: DocumentSource[];
  }>;
}

const ChatState = Annotation.Root({
  agent: Annotation<ChatAgent | undefined>(),
  answer: Annotation<string | undefined>(),
  message: Annotation<string>(),
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
      .addNode('classify', async (state) => ({
        agent: classifyIntent(state.message),
      }))
      .addNode('respond', async (state) =>
        this.answer(state.message, state.agent ?? 'general', state.sessionId),
      )
      .addEdge(START, 'classify')
      .addEdge('classify', 'respond')
      .addEdge('respond', END)
      .compile() as ChatGraph;
  }

  async run(message: string, context: ChatWorkflowContext = {}): Promise<ChatMessageResponse> {
    const state = await this.graph.invoke({ message, sessionId: context.sessionId });

    return ChatMessageResponseSchema.parse({
      agent: state.agent ?? 'general',
      answer: state.answer,
      mode: 'langgraph-demo',
      sources: state.sources ?? [],
    });
  }

  private async answer(
    message: string,
    agent: ChatAgent,
    sessionId: string | undefined,
  ): Promise<Pick<ChatMessageResponse, 'answer' | 'sources'>> {
    if (agent === 'documentos') {
      const response = await this.dependencies.documentAnswerer.execute(message, { sessionId });
      return { answer: response.answer, sources: response.sources };
    }
    if (agent === 'comunicados') {
      const response = await this.dependencies.communityNoticeDrafter.execute(
        buildCommunityNoticeInputFromText(message),
      );
      return { answer: formatCommunityNoticeAnswer(response), sources: [] };
    }
    if (agent === 'actas') {
      const response = await this.dependencies.meetingMinutesDrafter.execute(message, {
        sessionId,
      });
      return { answer: response.draft.body, sources: [] };
    }
    if (agent === 'incidencias') {
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
    if (agent === 'juntas') {
      if (!sessionId) {
        return {
          answer: 'No se pudo preparar el orden del día porque no hay una sesión activa.',
          sources: [],
        };
      }
      const response = await this.dependencies.meetingAgendaDrafter.execute({ sessionId });
      return { answer: response.draft.body, sources: [] };
    }

    return {
      answer: futureAgentAnswer[agent],
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
