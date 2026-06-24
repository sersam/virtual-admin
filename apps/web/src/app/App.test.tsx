import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const fallbackFetch = () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
};

function renderAt(path: string) {
  fallbackFetch();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('rutas de App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra la portada únicamente en la ruta índice', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Una administración más clara',
    );
  });

  it('genera las rutas de herramientas excluyendo la raíz', () => {
    renderAt('/documentos');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Pregunta a los documentos de la comunidad' }),
    ).toBeInTheDocument();
  });

  it('activa la ruta del chat coordinador', () => {
    renderAt('/chat');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Chat coordinador multiagente' }),
    ).toBeInTheDocument();
  });

  it('usa una pantalla segura para rutas desconocidas', () => {
    renderAt('/ruta-desconocida');
    expect(screen.getByRole('heading', { level: 1, name: 'Herramienta' })).toBeInTheDocument();
    expect(screen.getByText(/Esta herramienta estará disponible próximamente/)).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
