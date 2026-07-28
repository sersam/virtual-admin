export interface EmbeddingBatch {
  readonly inputTokens: number;
  readonly vectors: readonly (readonly number[])[];
}

export interface EmbeddingProvider {
  readonly dimensions: number;
  readonly model: string;
  embed(texts: readonly string[]): Promise<EmbeddingBatch>;
}
