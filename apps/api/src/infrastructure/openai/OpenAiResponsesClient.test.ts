import type { ResponseUsage } from 'openai/resources/responses/responses';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { OfficialOpenAiResponsesClient, type ParsedResponsesApi } from './OpenAiResponsesClient.js';
import { OpenAiProviderError } from './OpenAiProviderError.js';

const responseSchema = z.object({ value: z.string() });

type ParsedResponseBody = {
  readonly input: string;
  readonly instructions: string;
  readonly max_output_tokens: number;
  readonly model: string;
  readonly reasoning?: { readonly effort: 'minimal' };
  readonly store: false;
  readonly text: { readonly format: unknown };
};

describe('OfficialOpenAiResponsesClient', () => {
  it('envía la petición estructurada a OpenAI sin almacenar la respuesta', async () => {
    const parsedBodies: unknown[] = [];
    const responses: ParsedResponsesApi = {
      async parse<Output>(body: ParsedResponseBody) {
        parsedBodies.push(body);
        return {
          output_parsed: { value: 'ok' } as Output,
          usage: {
            input_tokens: 10,
            input_tokens_details: { cached_tokens: 3 },
            output_tokens: 4,
          } as ResponseUsage,
        };
      },
    };
    const client = new OfficialOpenAiResponsesClient('sk-test', responses);

    const response = await client.createStructuredResponse(createRequest());

    expect(parsedBodies).toEqual([
      expect.objectContaining({
        input: 'Redacta un comunicado.',
        instructions: 'Responde en español.',
        max_output_tokens: 120,
        model: 'gpt-5-nano',
        reasoning: { effort: 'minimal' },
        store: false,
        text: expect.objectContaining({ format: expect.anything() }),
      }),
    ]);
    expect(response).toEqual({
      output: { value: 'ok' },
      usage: { cachedInputTokens: 3, inputTokens: 10, outputTokens: 4 },
    });
  });

  it('rechaza una respuesta sin salida estructurada', async () => {
    const responses: ParsedResponsesApi = {
      async parse() {
        return { output_parsed: null, usage: null };
      },
    };
    const client = new OfficialOpenAiResponsesClient('sk-test', responses);

    await expect(client.createStructuredResponse(createRequest())).rejects.toBeInstanceOf(
      OpenAiProviderError,
    );
  });

  it('usa consumo cero cuando OpenAI no devuelve métricas de uso', async () => {
    const responses: ParsedResponsesApi = {
      async parse<Output>() {
        return { output_parsed: { value: 'ok' } as Output };
      },
    };
    const client = new OfficialOpenAiResponsesClient('sk-test', responses);

    const response = await client.createStructuredResponse(createRequest());

    expect(response.usage).toEqual({
      cachedInputTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  });
});

function createRequest() {
  return {
    input: 'Redacta un comunicado.',
    instructions: 'Responde en español.',
    maxOutputTokens: 120,
    model: 'gpt-5-nano',
    promptVersion: 'test.v1',
    schema: responseSchema,
    schemaName: 'test_response_v1',
  };
}
