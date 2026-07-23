import type {
  ChatAgent,
  ChatMessageResponse,
  DocumentQueryResponse,
  DocumentSource,
  Incident,
} from '@admin/contracts';
import { ChatMessageResponseSchema } from '@admin/contracts';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { ChatWorkflow, ChatWorkflowContext } from '../../application/ports/ChatWorkflow.js';
import { classifyIntent } from '../../domain/agent/IntentClassifier.js';
import { draftCommunityNotice } from '../../domain/communication/CommunityNoticeDraft.js';
import { createMeetingMinutesDraft } from '../../domain/meetingMinutes/MeetingMinutesDraft.js';

interface DocumentAnswerer {
  execute(question: string, context?: ChatWorkflowContext): Promise<DocumentQueryResponse>;
}

interface IncidentCreator {
  execute(input: { readonly description: string; readonly sessionId: string }): Promise<Incident>;
}

interface LangGraphChatWorkflowDependencies {
  readonly documentAnswerer: DocumentAnswerer;
  readonly incidentCreator: IncidentCreator;
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
      return { answer: draftCommunityNotice(message), sources: [] };
    }
    if (agent === 'actas') {
      return { answer: createMeetingMinutesDraft(message).body, sources: [] };
    }
    if (agent === 'incidencias') {
      if (!sessionId) {
        return {
          answer: 'No se pudo registrar la incidencia porque no hay una sesión activa.',
          sources: [],
        };
      }
      const incident = await this.dependencies.incidentCreator.execute({
        description: message,
        sessionId,
      });
      return { answer: formatIncidentAnswer(incident), sources: [] };
    }

    return {
      answer: futureAgentAnswer[agent],
      sources: [],
    };
  }
}

const futureAgentAnswer: Record<
  Exclude<ChatAgent, 'documentos' | 'comunicados' | 'actas' | 'incidencias'>,
  string
> = {
  general:
    'Soy el coordinador de la demo. Puedo derivar peticiones sobre documentos, comunicados, actas, incidencias y preparación de juntas.',
  juntas:
    'Soy el agente de juntas. En esta US-004 puedo clasificar tu petición; la preparación completa del orden del día llegará en la US-008.',
};

function formatIncidentAnswer(incident: Incident): string {
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
