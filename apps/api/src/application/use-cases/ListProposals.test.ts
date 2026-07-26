import { describe, expect, it } from 'vitest';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';
import { ListProposals } from './ListProposals.js';

describe('ListProposals', () => {
  it('devuelve las propuestas de la sesion de mas reciente a mas antigua', async () => {
    const proposals: CommunityProposal[] = [
      createProposal({ id: 'proposal-old', createdAt: new Date('2026-07-26T09:00:00.000Z') }),
      createProposal({ id: 'proposal-new', createdAt: new Date('2026-07-26T10:00:00.000Z') }),
      createProposal({
        id: 'proposal-other-session',
        sessionId: 'session-b',
        createdAt: new Date('2026-07-26T11:00:00.000Z'),
      }),
    ];
    const useCase = new ListProposals({
      repository: {
        listBySession: async (sessionId) =>
          proposals.filter((proposal) => proposal.sessionId === sessionId),
        save: async () => undefined,
      },
    });

    await expect(useCase.execute({ sessionId: 'session-a' })).resolves.toEqual([
      expect.objectContaining({ id: 'proposal-new' }),
      expect.objectContaining({ id: 'proposal-old' }),
    ]);
  });

  it('mantiene orden determinista cuando la fecha coincide', async () => {
    const createdAt = new Date('2026-07-26T10:00:00.000Z');
    const useCase = new ListProposals({
      repository: {
        listBySession: async () => [
          createProposal({ id: 'proposal-b', createdAt }),
          createProposal({ id: 'proposal-a', createdAt }),
        ],
        save: async () => undefined,
      },
    });

    await expect(useCase.execute({ sessionId: 'session-a' })).resolves.toEqual([
      expect.objectContaining({ id: 'proposal-b' }),
      expect.objectContaining({ id: 'proposal-a' }),
    ]);
  });

  it('propaga errores del repositorio', async () => {
    const useCase = new ListProposals({
      repository: {
        listBySession: async () => {
          throw new Error('repository unavailable');
        },
        save: async () => undefined,
      },
    });

    await expect(useCase.execute({ sessionId: 'session-a' })).rejects.toThrow(
      'repository unavailable',
    );
  });
});

function createProposal(overrides: Partial<CommunityProposal> = {}): CommunityProposal {
  return {
    id: 'proposal-0001',
    sessionId: 'session-a',
    description: 'Instalar aparcabicis en el patio interior.',
    createdAt: new Date('2026-07-26T10:00:00.000Z'),
    ...overrides,
  };
}
