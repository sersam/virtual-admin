import { buildDocumentExcerpt } from '../../domain/document/CommunityDocument.js';
import type {
  DocumentAnswerGenerator,
  DocumentAnswerEvidence,
  GeneratedDocumentAnswer,
  GenerateDocumentAnswerInput,
} from '../../application/ports/DocumentAnswerGenerator.js';

export class DeterministicDocumentAnswerGenerator implements DocumentAnswerGenerator {
  async generate(input: GenerateDocumentAnswerInput): Promise<GeneratedDocumentAnswer> {
    const sourceSummary = input.evidence
      .map(({ title, section }) => `${title}, sección ${section}`)
      .join('; ');
    const firstExcerpt = buildDocumentExcerpt(toDocument(input.evidence[0]!), 160);

    return {
      answer: `Según la documentación recuperada, ${firstExcerpt} He usado como fuentes: ${sourceSummary}.`,
      sourceIds: input.evidence.map(({ id }) => id),
      mode: 'deterministic-demo',
    };
  }
}

function toDocument(evidence: DocumentAnswerEvidence) {
  return {
    id: evidence.id,
    title: evidence.title,
    type: 'adjunto' as const,
    section: evidence.section,
    content: evidence.content,
    documentUrl: '',
  };
}
