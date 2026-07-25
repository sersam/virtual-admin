import { render, screen } from '@testing-library/react';
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

    await user.clear(screen.getByLabelText('Asunto'));
    await user.type(screen.getByLabelText('Asunto'), 'Corte de agua');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'recordatorio');
    await user.selectOptions(screen.getByLabelText('Audiencia'), 'residentes');
    await user.selectOptions(screen.getByLabelText('Tono'), 'cercano');
    await user.click(screen.getByRole('button', { name: 'Redactar comunicado' }));

    expect(await screen.findByRole('heading', { name: 'Corte de agua' })).toBeInTheDocument();
    expect(screen.getByText(/Estimados vecinos:/)).toBeInTheDocument();
    expect(screen.getByText('Demo determinista')).toBeInTheDocument();
  });

  it('muestra el proveedor OpenAI cuando la API lo devuelve', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: {
            subject: 'Corte de agua',
            body: 'Estimados vecinos:\n\nLes informamos sobre el corte de agua.',
          },
          mode: 'openai',
        }),
        { status: 200 },
      ),
    );

    render(<CommunityNoticePanel />);

    await user.click(screen.getByRole('button', { name: 'Redactar comunicado' }));

    expect(await screen.findByText('OpenAI · GPT-5 nano')).toBeInTheDocument();
  });
});
