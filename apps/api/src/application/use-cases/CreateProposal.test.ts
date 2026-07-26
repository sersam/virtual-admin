import { describe, expect, it } from 'vitest';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';
import type { ProposalRepository } from '../ports/ProposalRepository.js';
import { CreateProposal } from './CreateProposal.js';

describe('CreateProposal', () => {
  it('normaliza y guarda una propuesta asociada a la sesion', async () => {
    const repository = createProposalRepository();
    const useCase = new CreateProposal({
      clock: { now: () => new Date('2026-07-26T10:00:00.000Z') },
      ids: { randomId: () => 'proposal-0001' },
      repository,
    });

    const proposal = await useCase.execute({
      sessionId: 'session-a',
      description: '  Instalar aparcabicis en el patio interior.  ',
    });

    expect(proposal).toEqual({
      id: 'proposal-0001',
      sessionId: 'session-a',
      description: 'Instalar aparcabicis en el patio interior.',
      createdAt: new Date('2026-07-26T10:00:00.000Z'),
    });
    await expect(repository.listBySession('session-a')).resolves.toEqual([proposal]);
  });

  it('rechaza descripciones demasiado cortas tras normalizar', async () => {
    const useCase = new CreateProposal({
      clock: { now: () => new Date('2026-07-26T10:00:00.000Z') },
      ids: { randomId: () => 'proposal-0001' },
      repository: createProposalRepository(),
    });

    await expect(
      useCase.execute({
        sessionId: 'session-a',
        description: ' 123456789 ',
      }),
    ).rejects.toThrow('La descripción de la propuesta debe tener entre 10 y 1000 caracteres.');
  });

  it('propaga errores del repositorio', async () => {
    const useCase = new CreateProposal({
      clock: { now: () => new Date('2026-07-26T10:00:00.000Z') },
      ids: { randomId: () => 'proposal-0001' },
      repository: {
        listBySession: async () => [],
        save: async () => {
          throw new Error('repository unavailable');
        },
      },
    });

    await expect(
      useCase.execute({
        sessionId: 'session-a',
        description: 'Instalar aparcabicis en el patio interior.',
      }),
    ).rejects.toThrow('repository unavailable');
  });
});

function createProposalRepository(): ProposalRepository {
  const proposals: CommunityProposal[] = [];

  return {
    listBySession: async (sessionId) =>
      proposals.filter((proposal) => proposal.sessionId === sessionId),
    save: async (proposal) => {
      proposals.push(proposal);
    },
  };
}
