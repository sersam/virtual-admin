import { AiProviderError } from '../../application/ports/AiProviderError.js';

export class OpenAiProviderError extends AiProviderError {
  constructor(
    message = 'No se pudo completar la operación con OpenAI.',
    options: { readonly cause?: unknown } = {},
  ) {
    super(message, options);
  }
}
