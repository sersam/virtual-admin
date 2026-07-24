export class AiProviderError extends Error {
  constructor(
    message = 'No se pudo completar la operación con el proveedor IA.',
    options: { readonly cause?: unknown } = {},
  ) {
    super(message, options);
  }
}
