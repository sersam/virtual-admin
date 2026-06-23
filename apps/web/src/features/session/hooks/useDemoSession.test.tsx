import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDemoSession } from './useDemoSession';

const apiSession = {
  mode: 'api',
  session: {
    id: '49fa210a-1189-4f4f-8d7a-8f832f3c1ec1',
    createdAt: '2026-06-23T08:00:00.000Z',
    lastSeenAt: '2026-06-23T08:01:00.000Z',
    expiresAt: '2026-06-24T08:00:00.000Z',
    requestsUsed: 1,
    requestsLimit: 120,
  },
};

describe('useDemoSession', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publica la sesión recibida desde la API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(apiSession), { status: 200 }),
    );

    const { result } = renderHook(() => useDemoSession());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.data.mode).toBe('api');
  });

  it('usa fallback local cuando la API falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useDemoSession());

    await waitFor(() => expect(result.current.status).toBe('fallback'));
    expect(result.current.data.mode).toBe('local-demo');
  });

  it('cancela la petición cuando el componente se desmonta', async () => {
    let abortSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation((_, options) => {
      abortSignal = options?.signal ?? undefined;
      return new Promise(() => undefined);
    });

    const { unmount } = renderHook(() => useDemoSession());
    unmount();

    await waitFor(() => expect(abortSignal?.aborted).toBe(true));
  });
});
