import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('muestra el estado demo y su indicador visual', () => {
    const { container } = render(<StatusPill />);
    expect(screen.getByText('Demo disponible')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
