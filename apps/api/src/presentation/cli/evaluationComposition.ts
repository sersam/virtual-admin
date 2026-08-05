import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';
import { AnswerDocumentQuestion } from '../../application/use-cases/AnswerDocumentQuestion.js';
import { CreateIncident } from '../../application/use-cases/CreateIncident.js';
import { DraftCommunityNotice } from '../../application/use-cases/DraftCommunityNotice.js';
import { DraftMeetingAgenda } from '../../application/use-cases/DraftMeetingAgenda.js';
import { DraftMeetingMinutes } from '../../application/use-cases/DraftMeetingMinutes.js';
import type { EvaluationPorts } from '../../application/evaluation/EvaluationRunner.js';
import type { AiProviders } from '../../infrastructure/openai/createAiProviders.js';
import { LexicalDocumentRetriever } from '../../infrastructure/document/LexicalDocumentRetriever.js';
import { InMemoryIncidentRepository } from '../../infrastructure/incident/InMemoryIncidentRepository.js';
import { InMemoryMeetingRepository } from '../../infrastructure/meeting/InMemoryMeetingRepository.js';
import { InMemoryPendingAgreementRepository } from '../../infrastructure/meetingAgenda/InMemoryPendingAgreementRepository.js';
import { InMemoryProposalRepository } from '../../infrastructure/proposal/InMemoryProposalRepository.js';
import type {
  AgendaEvaluationCase,
  IncidentEvaluationCase,
} from '../../application/evaluation/evaluationTypes.js';

const evaluationNow = new Date('2026-08-04T10:00:00.000Z');

export function createEvaluationPorts(providers: AiProviders): EvaluationPorts {
  return {
    answerDocumentQuestion: async (testCase) =>
      new AnswerDocumentQuestion({
        generator: providers.documentAnswerGenerator,
        retriever: new LexicalDocumentRetriever(testCase.documents),
      }).execute(testCase.question, { sessionId: testCase.id }),
    classifyChatIntent: async (testCase) =>
      (await providers.chatIntentClassifier.classify(testCase.message)).agent,
    createIncident: async (testCase) => {
      const useCase = new CreateIncident({
        classifier: providers.incidentClassifier,
        clock: fixedClock,
        ids: createSequentialIds(testCase),
        repository: new InMemoryIncidentRepository(),
      });

      return await useCase.execute({
        description: testCase.description,
        sessionId: `eval-${testCase.id}`,
      });
    },
    draftCommunityNotice: async (testCase) =>
      await new DraftCommunityNotice({ generator: providers.communityNoticeGenerator }).execute(
        testCase.input,
      ),
    draftMeetingAgenda: async (testCase) =>
      await (
        await createAgendaUseCase(testCase, providers)
      ).execute({
        meetingId: testCase.meetingId,
        sessionId: `eval-${testCase.id}`,
      }),
    draftMeetingMinutes: async (testCase) =>
      await new DraftMeetingMinutes({ generator: providers.meetingMinutesGenerator }).execute(
        testCase.notes,
        { sessionId: `eval-${testCase.id}` },
      ),
  };
}

async function createAgendaUseCase(testCase: AgendaEvaluationCase, providers: AiProviders) {
  const sessionId = `eval-${testCase.id}`;
  const incidentRepository = new InMemoryIncidentRepository();
  const pendingAgreementRepository = new InMemoryPendingAgreementRepository();
  const proposalRepository = new InMemoryProposalRepository();

  for (const incident of testCase.seed.incidents) {
    await incidentRepository.save(toCommunityIncident(sessionId, incident));
  }
  for (const agreement of testCase.seed.pendingAgreements) {
    await pendingAgreementRepository.saveIfAbsent({
      ...agreement,
      createdAt: new Date(agreement.createdAt),
      dueOn: agreement.dueOn,
      sessionId,
    });
  }
  for (const proposal of testCase.seed.proposals) {
    await proposalRepository.save(toCommunityProposal(sessionId, proposal));
  }

  return new DraftMeetingAgenda({
    generator: providers.meetingAgendaGenerator,
    incidentRepository,
    meetingRepository: new InMemoryMeetingRepository({ now: () => evaluationNow }),
    pendingAgreementRepository,
    proposalRepository,
  });
}

function toCommunityIncident(
  sessionId: string,
  incident: AgendaEvaluationCase['seed']['incidents'][number],
): CommunityIncident {
  const incidentBase = {
    ...incident,
    createdAt: new Date(incident.createdAt),
    sessionId,
    suggestedNotice: `Se ha registrado: ${incident.description}`,
    suggestedResponsible: 'Administracion',
  };

  if (incident.status === 'resuelta') {
    if (!incident.resolvedAt) {
      throw new Error(`La incidencia resuelta ${incident.id} no define resolvedAt.`);
    }

    return {
      ...incidentBase,
      resolvedAt: new Date(incident.resolvedAt),
      status: 'resuelta',
    };
  }

  return {
    ...incidentBase,
    resolvedAt: null,
    status: 'pendiente',
  };
}

function toCommunityProposal(
  sessionId: string,
  proposal: AgendaEvaluationCase['seed']['proposals'][number],
): CommunityProposal {
  return {
    ...proposal,
    createdAt: new Date(proposal.createdAt),
    sessionId,
  };
}

const fixedClock = {
  now: () => evaluationNow,
};

function createSequentialIds(testCase: IncidentEvaluationCase) {
  return {
    randomId: () => `eval-${testCase.id}`,
  };
}
