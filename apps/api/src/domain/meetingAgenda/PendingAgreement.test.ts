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
});
