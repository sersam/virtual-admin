import { describe, expect, it } from 'vitest';
import { createPendingAgreementSignature } from './PendingAgreement.js';

describe('PendingAgreement', () => {
  it('normaliza descripcion, responsable y fecha para detectar acuerdos equivalentes', () => {
    const signature = createPendingAgreementSignature({
      id: 'pending-1',
      sessionId: 'session-a',
      description: ' Revisar contrato ',
      assignee: 'ANA',
      dueDate: '30 DE JUNIO',
      createdAt: new Date('2026-06-23T08:00:00.000Z'),
    });

    expect(signature).toBe('["revisar contrato","ana","30 de junio"]');
  });

  it('usa campos vacios para responsable y fecha ausentes', () => {
    const signature = createPendingAgreementSignature({
      id: 'pending-1',
      sessionId: 'session-a',
      description: 'Revisar contrato',
      createdAt: new Date('2026-06-23T08:00:00.000Z'),
    });

    expect(signature).toBe('["revisar contrato","",""]');
  });

  it('mantiene equivalencias normalizadas y separa valores distintos', () => {
    const first = createPendingAgreementSignature({
      id: 'pending-1',
      sessionId: 'session-a',
      description: ' Revisar contrato ',
      assignee: 'ANA',
      dueDate: '30 DE JUNIO',
      createdAt: new Date('2026-06-23T08:00:00.000Z'),
    });
    const equivalent = createPendingAgreementSignature({
      id: 'pending-2',
      sessionId: 'session-a',
      description: 'revisar contrato',
      assignee: 'ana',
      dueDate: '30 de junio',
      createdAt: new Date('2026-06-23T08:05:00.000Z'),
    });
    const different = createPendingAgreementSignature({
      id: 'pending-3',
      sessionId: 'session-a',
      description: 'Revisar contrato de limpieza',
      assignee: 'Ana',
      dueDate: '30 de junio',
      createdAt: new Date('2026-06-23T08:10:00.000Z'),
    });

    expect(equivalent).toBe(first);
    expect(different).not.toBe(first);
  });
});
