import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMeetings } from './useMeetings';

describe('useMeetings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga juntas demo disponibles', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          meetings: [
            {
              id: 'meeting-ordinary-2026-09-18',
              kind: 'ordinaria',
              title: 'Junta ordinaria',
              scheduledAt: '2026-09-18T17:00:00.000Z',
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const { result } = renderHook(() => useMeetings());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.meetings[0]?.title).toBe('Junta ordinaria');
  });

  it('muestra error si no puede cargar juntas', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useMeetings());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('No se pudieron cargar las juntas demo.');
  });
});
