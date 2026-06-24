import type { DocumentQueryResponse, DocumentSource } from '@admin/contracts';
import {
  buildDocumentExcerpt,
  type RetrievedDocument,
} from '../../domain/document/CommunityDocument.js';
import type { DocumentRetriever } from '../ports/DocumentRetriever.js';
import type { SessionDocumentRetriever } from '../ports/SessionDocumentRetriever.js';

interface AnswerDocumentQuestionDependencies {
  readonly retriever: DocumentRetriever;
  readonly sessionRetriever?: SessionDocumentRetriever;
}

interface AnswerDocumentQuestionContext {
  readonly sessionId?: string;
}

export class AnswerDocumentQuestion {
  constructor(private readonly dependencies: AnswerDocumentQuestionDependencies) {}

  async execute(
    question: string,
    context: AnswerDocumentQuestionContext = {},
  ): Promise<DocumentQueryResponse> {
    const documents = await this.retrieveDocuments(question, context.sessionId);
    const sources = documents.map(toSource);

    return {
      answer: buildAnswer(question, documents),
      mode: 'lexical-demo',
      sources,
    };
  }

  private async retrieveDocuments(
    question: string,
    sessionId: string | undefined,
  ): Promise<RetrievedDocument[]> {
    const [baseDocuments, sessionDocuments] = await Promise.all([
      this.dependencies.retriever.retrieve(question, 3),
      sessionId && this.dependencies.sessionRetriever
        ? this.dependencies.sessionRetriever.retrieveForSession(sessionId, question, 3)
        : Promise.resolve([]),
    ]);

    return [...sessionDocuments, ...baseDocuments]
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
  }
}

function toSource(document: RetrievedDocument): DocumentSource {
  return {
    id: document.id,
    title: document.title,
    type: document.type,
    section: document.section,
    excerpt: buildDocumentExcerpt(document),
    documentUrl: document.documentUrl,
    score: document.score,
  };
}

function buildAnswer(question: string, documents: RetrievedDocument[]): string {
  if (documents.length === 0) {
    return `No he encontrado fuentes suficientes en la documentación cargada para responder a: “${question}”. Puedes reformular la consulta o revisar los documentos disponibles.`;
  }

  const sourceSummary = documents
    .map(({ title, section }) => `${title}, sección ${section}`)
    .join('; ');
  const firstExcerpt = buildDocumentExcerpt(documents[0]!, 160);

  return `Según la documentación de Residencial Sierra Nevada, ${firstExcerpt} He usado como fuentes: ${sourceSummary}.`;
}
