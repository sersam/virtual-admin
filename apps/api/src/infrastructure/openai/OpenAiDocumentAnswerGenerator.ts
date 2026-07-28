import { z } from 'zod';
import type { AiTelemetryReporter } from '../../application/ports/AiTelemetryReporter.js';
import type {
  DocumentAnswerGenerator,
  DocumentAnswerEvidence,
  GeneratedDocumentAnswer,
  GenerateDocumentAnswerInput,
} from '../../application/ports/DocumentAnswerGenerator.js';
import { executeOpenAiStructuredOperation } from './executeOpenAiStructuredOperation.js';
import type { OpenAiResponsesClient } from './OpenAiResponsesClient.js';
import { documentAnswerPrompt } from './versionedPrompts.js';

interface OpenAiDocumentAnswerGeneratorDependencies {
  readonly nowMs?: () => number;
  readonly responses: OpenAiResponsesClient;
  readonly telemetry: AiTelemetryReporter;
}

export class OpenAiDocumentAnswerGenerator implements DocumentAnswerGenerator {
  private readonly nowMs: () => number;

  constructor(private readonly dependencies: OpenAiDocumentAnswerGeneratorDependencies) {
    this.nowMs = dependencies.nowMs ?? Date.now;
  }

  async generate(input: GenerateDocumentAnswerInput): Promise<GeneratedDocumentAnswer> {
    const output = await executeOpenAiStructuredOperation(this.dependencies, {
      errorMessage: 'No se pudo generar la respuesta documental con OpenAI.',
      input: JSON.stringify({
        question: input.question,
        sources: input.evidence.map(toOpenAiEvidence),
      }),
      instructions: documentAnswerPrompt.instructions,
      maxOutputTokens: 600,
      operation: 'document-answer',
      promptVersion: documentAnswerPrompt.version,
      schema: createDocumentAnswerOutputSchema(input.evidence.map(({ id }) => id)),
      schemaName: 'document_answer_v1',
    });

    return { ...output, mode: 'openai' };
  }
}

function toOpenAiEvidence(evidence: DocumentAnswerEvidence): DocumentAnswerEvidence {
  return {
    id: evidence.id,
    title: evidence.title,
    section: evidence.section,
    content: evidence.content,
  };
}

function createDocumentAnswerOutputSchema(allowedSourceIds: readonly string[]) {
  const allowedSourceIdSet = new Set(allowedSourceIds);

  return z
    .object({
      answer: z.string().trim().min(1).max(2_000),
      sourceIds: z.array(z.string().trim().min(1)).min(1).max(3),
    })
    .superRefine(({ sourceIds }, context) => {
      const uniqueSourceIds = new Set(sourceIds);
      if (uniqueSourceIds.size !== sourceIds.length) {
        context.addIssue({
          code: 'custom',
          message: 'sourceIds contiene valores duplicados',
          path: ['sourceIds'],
        });
      }

      for (const sourceId of sourceIds) {
        if (!allowedSourceIdSet.has(sourceId)) {
          context.addIssue({
            code: 'custom',
            message: 'sourceIds contiene IDs no recuperados',
            path: ['sourceIds'],
          });
        }
      }
    });
}
