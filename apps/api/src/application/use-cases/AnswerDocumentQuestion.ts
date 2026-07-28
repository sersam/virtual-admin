import type { DocumentQueryResponse, DocumentSource } from '@admin/contracts';
import {
  buildDocumentExcerpt,
  type RetrievedDocument,
} from '../../domain/document/CommunityDocument.js';
import { AiProviderError } from '../ports/AiProviderError.js';
import type {
  DocumentAnswerEvidence,
  DocumentAnswerGenerator,
} from '../ports/DocumentAnswerGenerator.js';
import type { DocumentRetriever } from '../ports/DocumentRetriever.js';

interface AnswerDocumentQuestionDependencies {
  readonly retriever: DocumentRetriever;
  readonly generator: DocumentAnswerGenerator;
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
    if (documents.length === 0) {
      return {
        answer: buildInsufficientEvidenceAnswer(question),
        mode: this.dependencies.retriever.mode,
        sources: [],
      };
    }

    const generation = await this.dependencies.generator.generate({
      question,
      evidence: documents.map(toEvidence),
    });
    const citedDocuments = selectCitedDocuments(documents, generation.sourceIds);

    return {
      answer: generation.answer,
      mode: this.dependencies.retriever.mode,
      sources: citedDocuments.map(toSource),
    };
  }

  private async retrieveDocuments(
    question: string,
    sessionId: string | undefined,
  ): Promise<RetrievedDocument[]> {
    return this.dependencies.retriever.retrieve(question, 3, { sessionId });
  }
}

function toEvidence(document: RetrievedDocument): DocumentAnswerEvidence {
  return {
    id: document.id,
    title: document.title,
    section: document.section,
    content: buildDocumentExcerpt(document, 1200),
  };
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

function selectCitedDocuments(
  documents: RetrievedDocument[],
  sourceIds: readonly string[],
): RetrievedDocument[] {
  const documentById = new Map(documents.map((document) => [document.id, document]));
  const uniqueSourceIds = new Set(sourceIds);
  if (sourceIds.length === 0 || uniqueSourceIds.size !== sourceIds.length) {
    throw new AiProviderError('El proveedor IA devolvió fuentes documentales inválidas.');
  }

  return sourceIds.map((sourceId) => {
    const document = documentById.get(sourceId);
    if (!sourceId.trim() || !document) {
      throw new AiProviderError('El proveedor IA devolvió fuentes documentales inválidas.');
    }
    return document;
  });
}

function buildInsufficientEvidenceAnswer(question: string): string {
  return `No he encontrado fuentes suficientes en la documentación cargada para responder a: “${question}”. Puedes reformular la consulta o revisar los documentos disponibles.`;
}
