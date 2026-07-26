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
});
