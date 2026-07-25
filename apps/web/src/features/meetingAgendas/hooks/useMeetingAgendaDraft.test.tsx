import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMeetingAgendaDraft } from './useMeetingAgendaDraft';

describe('useMeetingAgendaDraft', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publica el borrador generado por la API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createAgendaResponse('Orden del día · Junta ordinaria · 18 de septiembre de 2026'),
    );
    const { result } = renderHook(() => useMeetingAgendaDraft());

    await result.current.generate('meeting-ordinary-2026-09-18');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.result?.draft.title).toBe(
      'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
    );
  });

  it('muestra error si la API no está disponible', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useMeetingAgendaDraft());

    await result.current.generate('meeting-ordinary-2026-09-18');

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

    void result.current.generate('meeting-ordinary-2026-09-18');
    void result.current.generate('meeting-extraordinary-2026-10-15');

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

  it('permite limpiar el borrador al cambiar de junta', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createAgendaResponse('Orden inicial'));
    const { result } = renderHook(() => useMeetingAgendaDraft());

    await result.current.generate('meeting-ordinary-2026-09-18');
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.reset());

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeUndefined();
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
      meeting: {
        id: 'meeting-ordinary-2026-09-18',
        kind: 'ordinaria',
        title: 'Junta ordinaria',
        scheduledAt: '2026-09-18T17:00:00.000Z',
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
