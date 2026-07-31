import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AiFallbackNotice } from './AiFallbackNotice';

describe('AiFallbackNotice', () => {
  it('muestra el motivo de fallback en español', () => {
    render(<AiFallbackNotice reason="provider-error" />);

    expect(screen.getByText(/OpenAI no respondió correctamente/i)).toBeInTheDocument();
  });

  it.each([
    ['ip-quota', /la IP alcanzó el límite diario/i],
    ['quota-unavailable', /control de límites no está disponible/i],
    ['session-quota', /esta sesión alcanzó el límite diario/i],
  ] as const)('muestra el texto para %s', (reason, message) => {
    render(<AiFallbackNotice reason={reason} />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('no renderiza nada sin motivo', () => {
    const { container } = render(<AiFallbackNotice />);

    expect(container).toBeEmptyDOMElement();
  });
});
