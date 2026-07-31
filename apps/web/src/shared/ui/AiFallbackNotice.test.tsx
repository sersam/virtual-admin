import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AiFallbackNotice } from './AiFallbackNotice';

describe('AiFallbackNotice', () => {
  it('muestra el motivo de fallback en español', () => {
    render(<AiFallbackNotice reason="provider-error" />);

    expect(screen.getByText(/OpenAI no respondió correctamente/i)).toBeInTheDocument();
  });

  it('no renderiza nada sin motivo', () => {
    const { container } = render(<AiFallbackNotice />);

    expect(container).toBeEmptyDOMElement();
  });
});
