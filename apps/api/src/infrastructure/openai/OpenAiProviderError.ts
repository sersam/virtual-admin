export class OpenAiProviderError extends Error {
  constructor(
    message = 'No se pudo completar la operación con OpenAI.',
    options: { readonly cause?: unknown } = {},
  ) {
    super(message, options);
  }
}
