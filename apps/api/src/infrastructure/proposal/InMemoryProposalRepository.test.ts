import { describe, expect, it } from 'vitest';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';
import { InMemoryProposalRepository } from './InMemoryProposalRepository.js';

describe('InMemoryProposalRepository', () => {
  it('lista solo propuestas de la sesion solicitada en orden de insercion', async () => {
    const repository = new InMemoryProposalRepository();
    const first = createProposal({ id: 'proposal-1', sessionId: 'session-a' });
    const second = createProposal({ id: 'proposal-2', sessionId: 'session-a' });
    const otherSession = createProposal({ id: 'proposal-3', sessionId: 'session-b' });

    await repository.save(first);
    await repository.save(otherSession);
    await repository.save(second);

    await expect(repository.listBySession('session-a')).resolves.toEqual([first, second]);
    await expect(repository.listBySession('session-b')).resolves.toEqual([otherSession]);
  });

  it('permite duplicados con identidad y fecha propias', async () => {
    const repository = new InMemoryProposalRepository();
    const first = createProposal({
      id: 'proposal-1',
      description: 'Instalar aparcabicis en el patio interior.',
      createdAt: new Date('2026-07-26T10:00:00.000Z'),
    });
    const duplicate = createProposal({
      id: 'proposal-2',
      description: 'Instalar aparcabicis en el patio interior.',
      createdAt: new Date('2026-07-26T10:05:00.000Z'),
    });

    await repository.save(first);
    await repository.save(duplicate);

    await expect(repository.listBySession('session-a')).resolves.toEqual([first, duplicate]);
  });

  it('devuelve un array vacio para sesiones sin propuestas', async () => {
    const repository = new InMemoryProposalRepository();

    await expect(repository.listBySession('session-empty')).resolves.toEqual([]);
  });
});

function createProposal(overrides: Partial<CommunityProposal> = {}): CommunityProposal {
  return {
    id: 'proposal-1',
    sessionId: 'session-a',
    description: 'Instalar aparcabicis en el patio interior.',
    createdAt: new Date('2026-07-26T10:00:00.000Z'),
    ...overrides,
  };
}
