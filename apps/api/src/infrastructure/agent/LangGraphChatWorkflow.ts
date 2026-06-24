import type {
  ChatAgent,
  ChatMessageResponse,
  DocumentQueryResponse,
  DocumentSource,
} from '@admin/contracts';
import { ChatMessageResponseSchema } from '@admin/contracts';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { ChatWorkflow } from '../../application/ports/ChatWorkflow.js';
import { classifyIntent } from '../../domain/agent/IntentClassifier.js';

interface DocumentAnswerer {
  execute(question: string): Promise<DocumentQueryResponse>;
}

interface LangGraphChatWorkflowDependencies {
  readonly documentAnswerer: DocumentAnswerer;
}

const ChatState = Annotation.Root({
  agent: Annotation<ChatAgent | undefined>(),
  answer: Annotation<string | undefined>(),
  message: Annotation<string>(),
  sources: Annotation<DocumentSource[]>({
    reducer: (_current, next) => next,
    default: () => [],
  }),
});

export class LangGraphChatWorkflow implements ChatWorkflow {
  private readonly graph;

  constructor(private readonly dependencies: LangGraphChatWorkflowDependencies) {
    this.graph = new StateGraph(ChatState)
      .addNode('classify', async (state) => ({
        agent: classifyIntent(state.message),
      }))
      .addNode('respond', async (state) => this.answer(state.message, state.agent ?? 'general'))
      .addEdge(START, 'classify')
      .addEdge('classify', 'respond')
      .addEdge('respond', END)
      .compile();
  }

  async run(message: string): Promise<ChatMessageResponse> {
    const state = await this.graph.invoke({ message });

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
  ): Promise<Pick<ChatMessageResponse, 'answer' | 'sources'>> {
    if (agent === 'documentos') {
      const response = await this.dependencies.documentAnswerer.execute(message);
      return { answer: response.answer, sources: response.sources };
    }

    return {
      answer: futureAgentAnswer[agent],
      sources: [],
    };
  }
}

const futureAgentAnswer: Record<Exclude<ChatAgent, 'documentos'>, string> = {
  actas:
    'Soy el agente de actas. En esta US-004 puedo clasificar tu petición; la generación completa de actas llegará en la US-006.',
  comunicados:
    'Soy el agente de comunicados. En esta US-004 puedo clasificar tu petición; la redacción completa de comunicados llegará en la US-005.',
  general:
    'Soy el coordinador de la demo. Puedo derivar peticiones sobre documentos, comunicados, actas, incidencias y preparación de juntas.',
  incidencias:
    'Soy el agente de incidencias. En esta US-004 puedo clasificar tu petición; el registro y priorización de incidencias llegará en la US-007.',
  juntas:
    'Soy el agente de juntas. En esta US-004 puedo clasificar tu petición; la preparación completa del orden del día llegará en la US-008.',
};
