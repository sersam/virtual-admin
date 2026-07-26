import { describe, expect, it } from 'vitest';
import type { IncidentListFilters, IncidentRepository } from '../ports/IncidentRepository.js';
import type { PendingAgreementRepository } from '../ports/PendingAgreementRepository.js';
import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';
import type { PendingAgreement } from '../../domain/meetingAgenda/PendingAgreement.js';
import { InMemoryIncidentRepository } from '../../infrastructure/incident/InMemoryIncidentRepository.js';
import { InMemoryPendingAgreementRepository } from '../../infrastructure/meetingAgenda/InMemoryPendingAgreementRepository.js';
import { InitializeDemoSessionData } from './InitializeDemoSessionData.js';

describe('InitializeDemoSessionData', () => {
  it('inicializa cuatro incidencias abiertas y dos acuerdos pendientes por sesion', async () => {
    const incidentRepository = new InMemoryIncidentRepository();
    const pendingAgreementRepository = new InMemoryPendingAgreementRepository();
    const useCase = new InitializeDemoSessionData({
      incidentRepository,
      pendingAgreementRepository,
    });

    await useCase.execute('session-a');

    await expect(incidentRepository.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({ id: 'demo-fuga-agua-urgente', status: 'pendiente' }),
      expect.objectContaining({ id: 'demo-averia-ascensor', status: 'pendiente' }),
      expect.objectContaining({ id: 'demo-basura-portal', status: 'pendiente' }),
      expect.objectContaining({ id: 'demo-ruidos-descanso', status: 'pendiente' }),
    ]);
    await expect(pendingAgreementRepository.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({ id: 'demo-acuerdo-ascensor' }),
      expect.objectContaining({ id: 'demo-acuerdo-placas-solares' }),
    ]);
  });

  it('usa inserciones idempotentes por contrato y conserva datos creados por el usuario', async () => {
    const incidentRepository = new RecordingIncidentRepository();
    const pendingAgreementRepository = new RecordingPendingAgreementRepository();
    const useCase = new InitializeDemoSessionData({
      incidentRepository,
      pendingAgreementRepository,
    });

    await useCase.execute('session-a');
    await incidentRepository.save({
      id: 'user-inc-1',
      sessionId: 'session-a',
      description: 'La puerta del garaje se queda abierta.',
      type: 'seguridad',
      priority: 'alta',
      suggestedResponsible: 'Administrador',
      suggestedNotice: 'Aviso de prueba para la incidencia del usuario.',
      createdAt: new Date('2026-07-25T12:00:00.000Z'),
      status: 'pendiente',
      resolvedAt: null,
    });
    await pendingAgreementRepository.save({
      id: 'user-agreement-1',
      sessionId: 'session-a',
      description: 'Revisar seguro comunitario',
      createdAt: new Date('2026-07-25T12:05:00.000Z'),
    });

    await useCase.execute('session-a');

    await expect(incidentRepository.listBySession('session-a')).resolves.toHaveLength(5);
    await expect(pendingAgreementRepository.listBySession('session-a')).resolves.toHaveLength(3);
    expect(incidentRepository.saveCalls).toHaveLength(1);
    expect(pendingAgreementRepository.saveCalls).toHaveLength(1);
  });

  it('mantiene aislados los datos entre sesiones', async () => {
    const incidentRepository = new InMemoryIncidentRepository();
    const pendingAgreementRepository = new InMemoryPendingAgreementRepository();
    const useCase = new InitializeDemoSessionData({
      incidentRepository,
      pendingAgreementRepository,
    });

    await useCase.execute('session-a');
    await useCase.execute('session-b');

    await expect(incidentRepository.listBySession('session-a')).resolves.toHaveLength(4);
    await expect(incidentRepository.listBySession('session-b')).resolves.toHaveLength(4);
    await expect(pendingAgreementRepository.listBySession('session-a')).resolves.toHaveLength(2);
    await expect(pendingAgreementRepository.listBySession('session-b')).resolves.toHaveLength(2);
  });
});

class RecordingIncidentRepository implements IncidentRepository {
  readonly saveCalls: CommunityIncident[] = [];
  private readonly incidents: CommunityIncident[] = [];
  private readonly idempotentKeys = new Set<string>();

  async listBySession(
    sessionId: string,
    filters: IncidentListFilters = {},
  ): Promise<CommunityIncident[]> {
    return this.incidents.filter(
      (incident) =>
        incident.sessionId === sessionId && (!filters.type || incident.type === filters.type),
    );
  }

  async resolve(): Promise<CommunityIncident | undefined> {
    return undefined;
  }

  async save(incident: CommunityIncident): Promise<void> {
    this.saveCalls.push(incident);
    this.incidents.push(incident);
  }

  async saveIfAbsent(incident: CommunityIncident): Promise<void> {
    const key = `${incident.sessionId}:${incident.id}`;
    if (this.idempotentKeys.has(key)) return;

    this.idempotentKeys.add(key);
    this.incidents.push(incident);
  }
}

class RecordingPendingAgreementRepository implements PendingAgreementRepository {
  readonly saveCalls: PendingAgreement[] = [];
  private readonly agreements: PendingAgreement[] = [];
  private readonly idempotentKeys = new Set<string>();

  async listBySession(sessionId: string): Promise<PendingAgreement[]> {
    return this.agreements.filter((agreement) => agreement.sessionId === sessionId);
  }

  async save(pendingAgreement: PendingAgreement): Promise<void> {
    this.saveCalls.push(pendingAgreement);
    this.agreements.push(pendingAgreement);
  }

  async saveIfAbsent(pendingAgreement: PendingAgreement): Promise<void> {
    const key = `${pendingAgreement.sessionId}:${pendingAgreement.id}`;
    if (this.idempotentKeys.has(key)) return;

    this.idempotentKeys.add(key);
    this.agreements.push(pendingAgreement);
  }
}
