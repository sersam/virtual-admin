import { describe, expect, it } from 'vitest';
import { InMemoryPendingAgreementRepository } from './InMemoryPendingAgreementRepository.js';

describe('InMemoryPendingAgreementRepository', () => {
  it('mantiene acuerdos pendientes aislados por sesión y evita duplicados normalizados', async () => {
    const repository = new InMemoryPendingAgreementRepository();
    await repository.save({
      id: 'pending-1',
      sessionId: 'session-a',
      description: 'Revisar contrato',
      assignee: 'Ana',
      dueDate: '30 de junio',
      createdAt: new Date('2026-06-23T08:00:00.000Z'),
    });
    await repository.save({
      id: 'pending-2',
      sessionId: 'session-a',
      description: ' revisar contrato ',
      assignee: 'ana',
      dueDate: '30 DE JUNIO',
      createdAt: new Date('2026-06-23T08:05:00.000Z'),
    });
    await repository.save({
      id: 'pending-3',
      sessionId: 'session-b',
      description: 'Revisar contrato',
      assignee: 'Ana',
      dueDate: '30 de junio',
      createdAt: new Date('2026-06-23T08:10:00.000Z'),
    });

    await expect(repository.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({ id: 'pending-1' }),
    ]);
    await expect(repository.listBySession('session-b')).resolves.toEqual([
      expect.objectContaining({ id: 'pending-3' }),
    ]);
  });

  it('mantiene acuerdos distintos aunque sus campos contengan separadores', async () => {
    const repository = new InMemoryPendingAgreementRepository();
    await repository.save({
      id: 'pending-1',
      sessionId: 'session-a',
      description: 'a|b',
      assignee: 'c',
      createdAt: new Date('2026-06-23T08:00:00.000Z'),
    });
    await repository.save({
      id: 'pending-2',
      sessionId: 'session-a',
      description: 'a',
      assignee: 'b',
      dueDate: 'c|',
      createdAt: new Date('2026-06-23T08:05:00.000Z'),
    });

    await expect(repository.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({ id: 'pending-1' }),
      expect.objectContaining({ id: 'pending-2' }),
    ]);
  });
});
