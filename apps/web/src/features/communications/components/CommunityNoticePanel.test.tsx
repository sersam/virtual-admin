import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityNoticePanel } from './CommunityNoticePanel';

describe('CommunityNoticePanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacta y muestra un comunicado editable para vecinos', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: {
            subject: 'Corte de agua',
            body: 'Estimados vecinos:\n\nLes informamos sobre el corte de agua.',
          },
          mode: 'deterministic-demo',
        }),
        { status: 200 },
      ),
    );

    render(<CommunityNoticePanel />);

    await user.clear(screen.getByLabelText('Necesidad del comunicado'));
    await user.type(
      screen.getByLabelText('Necesidad del comunicado'),
      'Redacta un comunicado sobre el corte de agua.',
    );
    await user.click(screen.getByRole('button', { name: 'Redactar comunicado' }));

    await waitFor(() => expect(screen.getByText('Corte de agua')).toBeInTheDocument());
    expect(screen.getByText(/Estimados vecinos:/)).toBeInTheDocument();
    expect(screen.getByText('Demo determinista')).toBeInTheDocument();
  });
});
