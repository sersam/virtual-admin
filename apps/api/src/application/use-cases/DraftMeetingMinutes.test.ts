import { describe, expect, it } from 'vitest';
import { DraftMeetingMinutes } from './DraftMeetingMinutes.js';
import type { MeetingMinutesGenerator } from '../ports/MeetingMinutesGenerator.js';
import type { PendingAgreementRepository } from '../ports/PendingAgreementRepository.js';

describe('DraftMeetingMinutes', () => {
  it('devuelve un borrador estructurado para transporte API', async () => {
    const useCase = new DraftMeetingMinutes();

    await expect(
      useCase.execute(
        [
          'Junta ordinaria.',
          'Acuerdo: aprobar presupuesto.',
          'Tarea: Revisar contrato; Responsable: Ana',
        ].join('\n'),
      ),
    ).resolves.toEqual({
      draft: {
        title: 'Acta de reunión',
        body: expect.stringContaining('Acuerdos:'),
        agreements: ['aprobar presupuesto.'],
        tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
      },
      mode: 'deterministic-demo',
    });
  });

  it('delega la generacion en el puerto configurado y expone su modo', async () => {
    const generator: MeetingMinutesGenerator = {
      draft: async (notes) => ({
        draft: {
          title: 'Acta de reunión',
          body: `Acta redactada desde: ${notes}`,
          agreements: ['aprobar el presupuesto'],
          tasks: [],
        },
        mode: 'openai',
      }),
    };
    const useCase = new DraftMeetingMinutes({ generator });

    await expect(useCase.execute('Notas suficientes para generar acta.')).resolves.toEqual({
      draft: {
        title: 'Acta de reunión',
        body: 'Acta redactada desde: Notas suficientes para generar acta.',
        agreements: ['aprobar el presupuesto'],
        tasks: [],
      },
      mode: 'openai',
    });
  });

  it('registra tareas y pendientes como acuerdos pendientes de la sesión', async () => {
    const saved: Awaited<ReturnType<PendingAgreementRepository['listBySession']>> = [];
    const useCase = new DraftMeetingMinutes({
      clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
      ids: { randomId: () => `pending-${saved.length + 1}` },
      pendingAgreementRepository: {
        listBySession: async () => saved,
        save: async (pendingAgreement) => {
          saved.push(pendingAgreement);
        },
        saveIfAbsent: async (pendingAgreement) => {
          saved.push(pendingAgreement);
        },
      },
    });

    await useCase.execute(
      [
        'Junta ordinaria.',
        'Acuerdo: aprobar presupuesto.',
        'Tarea: Revisar contrato; Responsable: Ana; Fecha: 30 de junio',
        'Pendiente: Pedir presupuesto de pintura',
      ].join('\n'),
      { sessionId: 'session-a' },
    );

    expect(saved).toEqual([
      {
        id: 'pending-1',
        sessionId: 'session-a',
        description: 'Revisar contrato',
        assignee: 'Ana',
        dueDate: '30 de junio',
        createdAt: new Date('2026-06-23T08:00:00.000Z'),
      },
      {
        id: 'pending-2',
        sessionId: 'session-a',
        description: 'Pedir presupuesto de pintura',
        createdAt: new Date('2026-06-23T08:00:00.000Z'),
      },
    ]);
  });

  it('no persiste acuerdos estructurados como acuerdos pendientes', async () => {
    const saved: Awaited<ReturnType<PendingAgreementRepository['listBySession']>> = [];
    const generator: MeetingMinutesGenerator = {
      draft: async () => ({
        draft: {
          title: 'Acta de reunión',
          body: 'Acta de reunión',
          agreements: ['aprobar presupuesto anual'],
          tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
        },
        mode: 'openai',
      }),
    };
    const useCase = new DraftMeetingMinutes({
      clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
      generator,
      ids: { randomId: () => `pending-${saved.length + 1}` },
      pendingAgreementRepository: {
        listBySession: async () => saved,
        save: async (pendingAgreement) => {
          saved.push(pendingAgreement);
        },
        saveIfAbsent: async (pendingAgreement) => {
          saved.push(pendingAgreement);
        },
      },
    });

    await useCase.execute('Notas suficientes para generar acta.', { sessionId: 'session-a' });

    expect(saved).toEqual([
      {
        id: 'pending-1',
        sessionId: 'session-a',
        description: 'Revisar contrato',
        assignee: 'Ana',
        createdAt: new Date('2026-06-23T08:00:00.000Z'),
      },
    ]);
  });
});
