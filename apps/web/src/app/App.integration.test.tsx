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

  it.each([
    ['Incidencias', 'Registra y clasifica incidencias'],
    ['Actas', 'Convierte notas en actas'],
    ['Preparar junta', 'Prepara el orden del día'],
  ])('navega a %s desde la navegación principal', async (linkName, headingName) => {
    const user = userEvent.setup();
    render(<App />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });
    await user.click(within(navigation).getByRole('link', { name: linkName }));
    expect(screen.getByRole('heading', { level: 1, name: headingName })).toBeInTheDocument();
  });
});
