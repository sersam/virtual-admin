import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { App } from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('rutas de App', () => {
  it('muestra la portada únicamente en la ruta índice', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Una administración más clara',
    );
  });

  it('genera las rutas de herramientas excluyendo la raíz', () => {
    renderAt('/documentos');
    expect(screen.getByRole('heading', { level: 1, name: 'Documentos' })).toBeInTheDocument();
  });

  it('usa una pantalla segura para rutas desconocidas', () => {
    renderAt('/ruta-desconocida');
    expect(screen.getByRole('heading', { level: 1, name: 'Herramienta' })).toBeInTheDocument();
    expect(screen.getByText(/Esta herramienta estará disponible próximamente/)).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
