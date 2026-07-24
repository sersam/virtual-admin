import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ResponseUsage } from 'openai/resources/responses/responses';
import type { z } from 'zod';
import { OpenAiProviderError } from './OpenAiProviderError.js';

export interface OpenAiUsage {
  readonly cachedInputTokens: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

interface StructuredResponseRequest<Output> {
  readonly input: string;
  readonly instructions: string;
  readonly maxOutputTokens: number;
  readonly model: string;
  readonly promptVersion: string;
  readonly schema: z.ZodType<Output>;
  readonly schemaName: string;
}

export interface StructuredResponse {
  readonly output: unknown;
  readonly usage: OpenAiUsage;
}

export interface OpenAiResponsesClient {
  createStructuredResponse<Output>(
    request: StructuredResponseRequest<Output>,
  ): Promise<StructuredResponse>;
}

export interface ParsedResponsesApi {
  parse<Output>(
    body: {
      input: string;
      instructions: string;
      max_output_tokens: number;
      model: string;
      reasoning?: { effort: 'minimal' };
      store: false;
      text: { format: unknown };
    },
    options?: unknown,
  ): Promise<{ output_parsed: Output | null; usage?: ResponseUsage | null }>;
}

export class OfficialOpenAiResponsesClient implements OpenAiResponsesClient {
  private readonly responses: ParsedResponsesApi;

  constructor(apiKey: string, responses?: ParsedResponsesApi) {
    this.responses =
      responses ?? (new OpenAI({ apiKey }) as OpenAI & { responses: ParsedResponsesApi }).responses;
  }

  async createStructuredResponse<Output>(
    request: StructuredResponseRequest<Output>,
  ): Promise<StructuredResponse> {
    const response = await this.responses.parse<Output>({
      input: request.input,
      instructions: request.instructions,
      max_output_tokens: request.maxOutputTokens,
      model: request.model,
      reasoning: { effort: 'minimal' },
      store: false,
      text: { format: zodTextFormat(request.schema, request.schemaName) },
    });

    if (response.output_parsed === null) {
      throw new OpenAiProviderError('OpenAI no devolvió una salida estructurada válida.', {
        cause: new Error('output_parsed es null'),
      });
    }

    return {
      output: response.output_parsed,
      usage: presentUsage(response.usage),
    };
  }
}

function presentUsage(usage: ResponseUsage | null | undefined): OpenAiUsage {
  return {
    cachedInputTokens: usage?.input_tokens_details?.cached_tokens ?? 0,
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  };
}
