import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocumentLibrary } from './DocumentLibrary';

describe('DocumentLibrary', () => {
  it('muestra todos los PDFs disponibles sin consultar', () => {
    render(<DocumentLibrary />);

    expect(screen.getByRole('heading', { name: 'Documentos disponibles' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Abrir PDF' })).toHaveLength(6);
    expect(screen.getByText('Estatutos de la comunidad')).toBeInTheDocument();
    expect(screen.getByText('Contrato de mantenimiento de jardines')).toBeInTheDocument();
  });
});
