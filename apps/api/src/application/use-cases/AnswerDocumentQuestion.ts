import type { DocumentQueryResponse, DocumentSource } from '@admin/contracts';
import {
  buildDocumentExcerpt,
  type RetrievedDocument,
} from '../../domain/document/CommunityDocument.js';
import type { DocumentRetriever } from '../ports/DocumentRetriever.js';

interface AnswerDocumentQuestionDependencies {
  readonly retriever: DocumentRetriever;
}

export class AnswerDocumentQuestion {
  constructor(private readonly dependencies: AnswerDocumentQuestionDependencies) {}

  async execute(question: string): Promise<DocumentQueryResponse> {
    const documents = await this.dependencies.retriever.retrieve(question, 3);
    const sources = documents.map(toSource);

    return {
      answer: buildAnswer(question, documents),
      mode: 'lexical-demo',
      sources,
    };
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
