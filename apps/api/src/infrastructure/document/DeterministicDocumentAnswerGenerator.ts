import { buildDocumentExcerpt } from '../../domain/document/CommunityDocument.js';
import type {
  DocumentAnswerGenerator,
  DocumentAnswerEvidence,
  GeneratedDocumentAnswer,
  GenerateDocumentAnswerInput,
} from '../../application/ports/DocumentAnswerGenerator.js';
import { AiProviderError } from '../../application/ports/AiProviderError.js';

export class DeterministicDocumentAnswerGenerator implements DocumentAnswerGenerator {
  async generate(input: GenerateDocumentAnswerInput): Promise<GeneratedDocumentAnswer> {
    validateEvidence(input.evidence);
    const sourceSummary = input.evidence
      .map(({ title, section }) => `${title}, sección ${section}`)
      .join('; ');
    const firstEvidence = readFirstEvidence(input.evidence);
    const firstExcerpt = buildDocumentExcerpt(toDocument(firstEvidence), 160);

    return {
      answer: `Según la documentación recuperada, ${firstExcerpt} He usado como fuentes: ${sourceSummary}.`,
      sourceIds: input.evidence.map(({ id }) => id),
      mode: 'deterministic-demo',
    };
  }
}

function readFirstEvidence(evidence: readonly DocumentAnswerEvidence[]): DocumentAnswerEvidence {
  const [firstEvidence] = evidence;
  if (!firstEvidence) {
    throw new AiProviderError('El generador documental recibió evidencias inválidas.');
  }
  return firstEvidence;
}

function validateEvidence(evidence: readonly DocumentAnswerEvidence[]): void {
  if (evidence.length === 0 || evidence.length > 3) {
    throw new AiProviderError('El generador documental recibió evidencias inválidas.');
  }

  for (const source of evidence) {
    if (
      !source.id.trim() ||
      !source.title.trim() ||
      !source.section.trim() ||
      !source.content.trim()
    ) {
      throw new AiProviderError('El generador documental recibió evidencias incompletas.');
    }
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
