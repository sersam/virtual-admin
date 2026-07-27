import { createApiApp } from './presentation/http/createApiApp.js';
import { SystemClock } from './infrastructure/runtime/SystemClock.js';
import { UuidGenerator } from './infrastructure/runtime/UuidGenerator.js';
import { LexicalDocumentRetriever } from './infrastructure/document/LexicalDocumentRetriever.js';
import { residencialSierraNevadaDocuments } from './infrastructure/document/residencialSierraNevadaDocuments.js';
import { InMemoryUploadedDocumentRepository } from './infrastructure/document/InMemoryUploadedDocumentRepository.js';
import { PdfParseUploadedDocumentTextExtractor } from './infrastructure/document/PdfParseUploadedDocumentTextExtractor.js';
import { UploadedSessionDocumentRetriever } from './infrastructure/document/UploadedSessionDocumentRetriever.js';
import { LangGraphChatWorkflow } from './infrastructure/agent/LangGraphChatWorkflow.js';
import { InMemoryIncidentRepository } from './infrastructure/incident/InMemoryIncidentRepository.js';
import { InMemoryMeetingRepository } from './infrastructure/meeting/InMemoryMeetingRepository.js';
import { InMemoryPendingAgreementRepository } from './infrastructure/meetingAgenda/InMemoryPendingAgreementRepository.js';
import { InMemoryProposalRepository } from './infrastructure/proposal/InMemoryProposalRepository.js';
import { createAiProviders } from './infrastructure/openai/createAiProviders.js';
import { createSessionRepository } from './infrastructure/session/createSessionRepository.js';

const port = Number(process.env.PORT ?? 3000);
const cookieSecret = readRequiredEnvironmentVariable('COOKIE_SECRET');
const uploadedDocumentRepository = new InMemoryUploadedDocumentRepository();
const aiProviders = createAiProviders({ openAiApiKey: process.env.OPENAI_API_KEY });
const sessionPersistence = await createSessionRepository({ databaseUrl: process.env.DATABASE_URL });

const app = createApiApp({
  clock: new SystemClock(),
  chatWorkflowFactory: ({
    answerDocumentQuestion,
    createIncident,
    draftCommunityNotice,
    draftMeetingAgenda,
    draftMeetingMinutes,
  }) =>
    new LangGraphChatWorkflow({
      communityNoticeDrafter: draftCommunityNotice,
      documentAnswerer: answerDocumentQuestion,
      incidentCreator: createIncident,
      meetingAgendaDrafter: draftMeetingAgenda,
      meetingMinutesDrafter: draftMeetingMinutes,
    }),
  communityNoticeGenerator: aiProviders.communityNoticeGenerator,
  cookieSecret,
  documentRetriever: new LexicalDocumentRetriever(residencialSierraNevadaDocuments),
  ids: new UuidGenerator(),
  incidentClassifier: aiProviders.incidentClassifier,
  incidentRepository: new InMemoryIncidentRepository(),
  meetingRepository: new InMemoryMeetingRepository(),
  pendingAgreementRepository: new InMemoryPendingAgreementRepository(),
  proposalRepository: new InMemoryProposalRepository(),
  repository: sessionPersistence.repository,
  secureCookies: process.env.NODE_ENV === 'production',
  version: '0.1.0',
  sessionDocumentRetriever: new UploadedSessionDocumentRetriever(uploadedDocumentRepository),
  uploadedDocumentRepository,
  uploadedDocumentTextExtractor: new PdfParseUploadedDocumentTextExtractor(),
});

const server = app.listen(port, () => {
  console.warn(`API demo disponible en http://127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      void sessionPersistence.close().finally(() => {
        process.exit(0);
      });
    });
  });
}

function readRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`La variable de entorno ${name} es obligatoria.`);
  return value;
}
