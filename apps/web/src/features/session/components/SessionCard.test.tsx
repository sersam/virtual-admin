import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionCard } from './SessionCard';

describe('SessionCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el estado de sesión aislada con fallback local', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));

    render(<SessionCard />);

    expect(
      screen.getByRole('heading', { name: 'Demo sin registro y sin estado compartido' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Fallback seguro activo')).toBeInTheDocument());
    expect(screen.getByText('Demo local')).toBeInTheDocument();
  });
});
