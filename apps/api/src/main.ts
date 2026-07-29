import { createApiApp } from './presentation/http/createApiApp.js';
import { SystemClock } from './infrastructure/runtime/SystemClock.js';
import { UuidGenerator } from './infrastructure/runtime/UuidGenerator.js';
import { createDocumentRetriever } from './infrastructure/document/createDocumentRetriever.js';
import { residencialSierraNevadaDocuments } from './infrastructure/document/residencialSierraNevadaDocuments.js';
import { PdfParseUploadedDocumentTextExtractor } from './infrastructure/document/PdfParseUploadedDocumentTextExtractor.js';
import { LangGraphChatWorkflow } from './infrastructure/agent/LangGraphChatWorkflow.js';
import { InMemoryMeetingRepository } from './infrastructure/meeting/InMemoryMeetingRepository.js';
import { createAiProviders } from './infrastructure/openai/createAiProviders.js';
import { createApiPersistence } from './infrastructure/persistence/createApiPersistence.js';

const port = Number(process.env.PORT ?? 3000);
const cookieSecret = readRequiredEnvironmentVariable('COOKIE_SECRET');
const aiProviders = createAiProviders({ openAiApiKey: process.env.OPENAI_API_KEY });
const persistence = await createApiPersistence({ databaseUrl: process.env.DATABASE_URL });
const clock = new SystemClock();

const app = createApiApp({
  clock,
  chatWorkflowFactory: ({
    answerDocumentQuestion,
    chatIntentClassifier,
    createIncident,
    draftCommunityNotice,
    draftMeetingAgenda,
    draftMeetingMinutes,
  }) =>
    new LangGraphChatWorkflow({
      chatIntentClassifier,
      communityNoticeDrafter: draftCommunityNotice,
      documentAnswerer: answerDocumentQuestion,
      incidentCreator: createIncident,
      meetingAgendaDrafter: draftMeetingAgenda,
      meetingMinutesDrafter: draftMeetingMinutes,
    }),
  chatIntentClassifier: aiProviders.chatIntentClassifier,
  communityNoticeGenerator: aiProviders.communityNoticeGenerator,
  documentAnswerGenerator: aiProviders.documentAnswerGenerator,
  cookieSecret,
  documentRetriever: createDocumentRetriever({
    documentChunkRepository: persistence.documentChunkRepository,
    documents: residencialSierraNevadaDocuments,
    embeddingProvider: aiProviders.embeddingProvider,
    uploadedDocumentRepository: persistence.uploadedDocumentRepository,
  }),
  ids: new UuidGenerator(),
  incidentClassifier: aiProviders.incidentClassifier,
  incidentRepository: persistence.incidentRepository,
  meetingAgendaGenerator: aiProviders.meetingAgendaGenerator,
  meetingMinutesGenerator: aiProviders.meetingMinutesGenerator,
  meetingRepository: new InMemoryMeetingRepository({ now: () => clock.now() }),
  pendingAgreementRepository: persistence.pendingAgreementRepository,
  proposalRepository: persistence.proposalRepository,
  repository: persistence.sessionRepository,
  secureCookies: process.env.NODE_ENV === 'production',
  version: '0.1.0',
  uploadedDocumentRepository: persistence.uploadedDocumentRepository,
  uploadedDocumentTextExtractor: new PdfParseUploadedDocumentTextExtractor(),
});

const server = app.listen(port, () => {
  console.warn(`API demo disponible en http://127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      void persistence.close().finally(() => {
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
