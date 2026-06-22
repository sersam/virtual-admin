import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Brand } from './Brand';

describe('Brand', () => {
  it('muestra las etiquetas en su variante predeterminada', () => {
    render(<Brand />);
    expect(screen.getByText('SIERRA')).toBeInTheDocument();
    expect(screen.getByText('Administrador virtual')).toBeInTheDocument();
  });

  it('oculta las etiquetas en su variante compacta', () => {
    render(<Brand compact />);
    expect(screen.queryByText('SIERRA')).not.toBeInTheDocument();
    expect(screen.queryByText('Administrador virtual')).not.toBeInTheDocument();
  });
});
