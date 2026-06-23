import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionCard } from './SessionCard';

describe('SessionCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el estado de sesión aislada con fallback local', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<SessionCard />);

    expect(
      screen.getByRole('heading', { name: 'Demo sin registro y sin estado compartido' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Fallback seguro activo')).toBeInTheDocument());
    expect(screen.getByText('Demo local')).toBeInTheDocument();
  });

  it('muestra el estado de sesión con API conectada', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          mode: 'api',
          session: {
            id: '49fa210a-1189-4f4f-8d7a-8f832f3c1ec1',
            createdAt: '2026-06-23T10:00:00.000Z',
            lastSeenAt: '2026-06-23T10:05:00.000Z',
            expiresAt: '2026-06-24T10:00:00.000Z',
            requestsUsed: 5,
            requestsLimit: 120,
          },
        }),
        { status: 200 },
      ),
    );

    render(<SessionCard />);

    await waitFor(() => expect(screen.getByText('API conectada')).toBeInTheDocument());
    expect(screen.getByText('API Express')).toBeInTheDocument();
    expect(screen.getByText('5/120')).toBeInTheDocument();
  });
});
