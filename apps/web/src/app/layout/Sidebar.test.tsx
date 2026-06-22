import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

function setMobileViewport() {
  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('Sidebar', () => {
  it('impide enfocar la navegación móvil mientras está cerrada', () => {
    setMobileViewport();
    const { rerender } = render(
      <MemoryRouter>
        <Sidebar open={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const sidebar = screen.getByRole('complementary', { hidden: true });
    expect(sidebar).toHaveAttribute('inert');
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');

    rerender(
      <MemoryRouter>
        <Sidebar open onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(sidebar).not.toHaveAttribute('inert');
    expect(sidebar).toHaveAttribute('aria-hidden', 'false');
  });
});
