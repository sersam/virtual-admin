export class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    operation: string,
  ) {
    super(`No se pudo ${operation} (HTTP ${status}).`);
  }
}

export class ApiTransportError extends Error {
  constructor(operation: string, options: { readonly cause?: unknown } = {}) {
    super(`No se pudo conectar con la API para ${operation}.`, options);
  }
}

export function isApiTransportError(error: unknown): error is ApiTransportError {
  return error instanceof ApiTransportError;
}
