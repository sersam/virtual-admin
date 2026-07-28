import type { AiProviderMode } from './AiProviderMode.js';

export interface DocumentAnswerEvidence {
  readonly id: string;
  readonly title: string;
  readonly section: string;
  readonly content: string;
}

export interface GenerateDocumentAnswerInput {
  readonly question: string;
  readonly evidence: readonly DocumentAnswerEvidence[];
}

export interface GeneratedDocumentAnswer {
  readonly answer: string;
  readonly sourceIds: readonly string[];
  readonly mode: AiProviderMode;
}

export interface DocumentAnswerGenerator {
  generate(input: GenerateDocumentAnswerInput): Promise<GeneratedDocumentAnswer>;
}
