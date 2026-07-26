import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProposal, listProposals } from './proposals';

const proposal = {
  id: 'proposal-0001',
  description: 'Instalar aparcabicis en el patio interior.',
  createdAt: '2026-07-26T10:00:00.000Z',
};

describe('proposals api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('crea una propuesta vecinal validada', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ proposal }), { status: 201 }),
    );

    await expect(createProposal('  Instalar aparcabicis en el patio interior.  ')).resolves.toEqual(
      proposal,
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/proposals',
      expect.objectContaining({
        body: JSON.stringify({ description: proposal.description }),
        credentials: 'include',
        method: 'POST',
      }),
    );
  });

  it('lista propuestas de sesion', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ proposals: [proposal] }), { status: 200 }),
    );

    await expect(listProposals()).resolves.toEqual([proposal]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/proposals',
      expect.objectContaining({ credentials: 'include', method: 'GET' }),
    );
  });

  it('rechaza errores HTTP y respuestas invalidas', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR' } }), { status: 500 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ proposals: [{ ...proposal, id: '' }] })),
      );

    await expect(createProposal(proposal.description)).rejects.toThrow(
      'No se pudo registrar la propuesta',
    );
    await expect(listProposals()).rejects.toThrow();
  });

  it('propaga mensajes de error del backend si estan disponibles', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'SESSION_LIMIT_REACHED',
              message: 'Has alcanzado el límite de uso de esta sesión demo.',
            },
          }),
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'SESSION_LIMIT_REACHED',
              message: 'Has alcanzado el límite de uso de esta sesión demo.',
            },
          }),
          { status: 429 },
        ),
      );

    await expect(createProposal(proposal.description)).rejects.toThrow(
      'Has alcanzado el límite de uso de esta sesión demo.',
    );
    await expect(listProposals()).rejects.toThrow(
      'Has alcanzado el límite de uso de esta sesión demo.',
    );
  });
});
