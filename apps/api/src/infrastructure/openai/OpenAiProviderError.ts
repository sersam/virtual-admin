export class OpenAiProviderError extends Error {
  readonly cause?: unknown;

  constructor(
    message = 'No se pudo completar la operación con OpenAI.',
    options: { readonly cause?: unknown } = {},
  ) {
    super(message);
    this.cause = options.cause;
  }
}
