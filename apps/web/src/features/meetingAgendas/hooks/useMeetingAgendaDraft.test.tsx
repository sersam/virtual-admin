import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMeetingAgendaDraft } from './useMeetingAgendaDraft';

describe('useMeetingAgendaDraft', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publica el borrador generado por la API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createAgendaResponse('Orden del día'));
    const { result } = renderHook(() => useMeetingAgendaDraft());

    await result.current.generate();

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.result?.draft.title).toBe('Orden del día');
  });

  it('muestra error si la API no está disponible', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useMeetingAgendaDraft());

    await result.current.generate();

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('No se pudo preparar el orden del día.');
  });

  it('ignora respuestas obsoletas de generaciones anteriores', async () => {
    const firstRequest = createDeferredResponse();
    const secondRequest = createDeferredResponse();
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const { result } = renderHook(() => useMeetingAgendaDraft());

    await act(async () => {
      void result.current.generate();
    });
    await act(async () => {
      void result.current.generate();
    });

    await act(async () => {
      secondRequest.resolve(createAgendaResponse('Orden nuevo'));
      await secondRequest.promise;
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.result?.draft.title).toBe('Orden nuevo');

    await act(async () => {
      firstRequest.resolve(createAgendaResponse('Orden antiguo'));
      await firstRequest.promise;
    });

    expect(result.current.result?.draft.title).toBe('Orden nuevo');
  });
});

function createAgendaResponse(title: string): Response {
  return new Response(
    JSON.stringify({
      draft: {
        title,
        body: `${title}\n\n1. [Alta] Revisar contrato.`,
        items: [
          {
            description: 'Revisar contrato',
            priority: 'alta',
            sourceType: 'pending-agreement',
            sourceId: 'pending-1',
            assignee: 'Ana',
          },
        ],
      },
      mode: 'deterministic-demo',
    }),
    { status: 200 },
  );
}

function createDeferredResponse(): {
  readonly promise: Promise<Response>;
  readonly resolve: (response: Response) => void;
} {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}
