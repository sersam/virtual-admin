import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityNoticePanel } from './CommunityNoticePanel';

describe('CommunityNoticePanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    expect(screen.getByLabelText('Asunto editable')).toHaveValue('Corte de agua');
    expect(screen.getByLabelText('Cuerpo editable del comunicado')).toHaveValue(
      'Estimados vecinos:\n\nLes informamos sobre el corte de agua.',
    );
    expect(screen.getByText('Demo determinista')).toBeInTheDocument();
  });

  it('usa valores iniciales recibidos desde chat', () => {
    render(
      <CommunityNoticePanel
        initialInput={{
          subject: 'Limpieza del garaje',
          type: 'recordatorio',
          audience: 'residentes',
          tone: 'cercano',
        }}
      />,
    );

    expect(screen.getByLabelText('Asunto')).toHaveValue('Limpieza del garaje');
    expect(screen.getByLabelText('Tipo')).toHaveValue('recordatorio');
    expect(screen.getByLabelText('Audiencia')).toHaveValue('residentes');
    expect(screen.getByLabelText('Tono')).toHaveValue('cercano');
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

  it('copia el asunto y cuerpo editados al portapapeles', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
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

    await user.click(screen.getByRole('button', { name: 'Redactar comunicado' }));
    await user.clear(await screen.findByLabelText('Asunto editable'));
    await user.type(screen.getByLabelText('Asunto editable'), 'Corte de agua actualizado');
    await user.clear(screen.getByLabelText('Cuerpo editable del comunicado'));
    await user.type(
      screen.getByLabelText('Cuerpo editable del comunicado'),
      'Contenido editado para copiar.',
    );
    await user.click(screen.getByRole('button', { name: 'Copiar comunicado' }));

    expect(writeText).toHaveBeenCalledWith(
      'Asunto: Corte de agua actualizado\n\nContenido editado para copiar.',
    );
    expect(await screen.findByText('Comunicado copiado.')).toBeInTheDocument();
  });

  it('muestra error accesible cuando falla la copia', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
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

    await user.click(screen.getByRole('button', { name: 'Redactar comunicado' }));
    await user.click(await screen.findByRole('button', { name: 'Copiar comunicado' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo copiar el comunicado.');
  });

  it('descarga PDF con el asunto y cuerpo editados', async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi.fn(() => 'blob:comunicado');
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl });
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
    const clickedDownloads: string[] = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = () => {
          clickedDownloads.push((element as HTMLAnchorElement).download);
        };
      }
      return element;
    });

    render(<CommunityNoticePanel />);

    await user.click(screen.getByRole('button', { name: 'Redactar comunicado' }));
    await user.clear(await screen.findByLabelText('Asunto editable'));
    await user.type(screen.getByLabelText('Asunto editable'), 'Aviso editado');
    await user.clear(screen.getByLabelText('Cuerpo editable del comunicado'));
    await user.type(screen.getByLabelText('Cuerpo editable del comunicado'), 'PDF editado.');
    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }));

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickedDownloads).toEqual(['comunicado.pdf']);
  });

  it('bloquea copia y PDF cuando el borrador editable queda vacío', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Redactar comunicado' }));
    await user.clear(await screen.findByLabelText('Cuerpo editable del comunicado'));

    expect(screen.getByRole('button', { name: 'Copiar comunicado' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeDisabled();
  });
});
