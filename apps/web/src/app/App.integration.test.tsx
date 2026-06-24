import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('presenta la comunidad y sus métricas en la portada', () => {
    render(<App />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Una administración más clara',
    );
    expect(screen.getAllByText('Residencial Sierra Nevada').length).toBeGreaterThan(0);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Demo sin registro y sin estado compartido' }),
    ).toBeInTheDocument();
  });

  it('navega a una herramienta futura y permite volver', async () => {
    const user = userEvent.setup();
    render(<App />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });
    await user.click(within(navigation).getByRole('link', { name: 'Actas' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Actas' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Volver al inicio' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Una administración más clara',
    );
  });
});
