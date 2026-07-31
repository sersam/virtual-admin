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
import { PersistentAiTelemetryReporter } from './infrastructure/telemetry/PersistentAiTelemetryReporter.js';

const port = Number(process.env.PORT ?? 3000);
const cookieSecret = readRequiredEnvironmentVariable('COOKIE_SECRET');
const persistence = await createApiPersistence({ databaseUrl: process.env.DATABASE_URL });
const clock = new SystemClock();
const aiTelemetry = new PersistentAiTelemetryReporter({
  clock,
  repository: persistence.aiTelemetryEventRepository,
});
const aiProviders = createAiProviders({
  openAiApiKey: process.env.OPENAI_API_KEY,
  telemetry: aiTelemetry,
});
const deterministicAiProviders = createAiProviders({});
const openAiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
const aiActionSessionLimit = readPositiveIntegerEnvironmentVariable(
  'AI_ACTION_SESSION_DAILY_LIMIT',
  20,
);
const aiActionIpLimit = readPositiveIntegerEnvironmentVariable('AI_ACTION_IP_DAILY_LIMIT', 100);

const app = createApiApp({
  aiActionIpLimit,
  aiActionQuotaRepository: persistence.aiActionQuotaRepository,
  aiActionSessionLimit,
  aiTelemetryEventRepository: persistence.aiTelemetryEventRepository,
  aiTelemetryReporter: aiTelemetry,
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
  deterministicChatIntentClassifier: deterministicAiProviders.chatIntentClassifier,
  deterministicCommunityNoticeGenerator: deterministicAiProviders.communityNoticeGenerator,
  deterministicDocumentAnswerGenerator: deterministicAiProviders.documentAnswerGenerator,
  deterministicDocumentRetriever: createDocumentRetriever({
    documents: residencialSierraNevadaDocuments,
    uploadedDocumentRepository: persistence.uploadedDocumentRepository,
  }),
  deterministicIncidentClassifier: deterministicAiProviders.incidentClassifier,
  deterministicMeetingAgendaGenerator: deterministicAiProviders.meetingAgendaGenerator,
  deterministicMeetingMinutesGenerator: deterministicAiProviders.meetingMinutesGenerator,
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
  openAiConfigured,
  trustProxy: process.env.NODE_ENV === 'production' ? 1 : false,
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

function readPositiveIntegerEnvironmentVariable(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) return fallback;

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`La variable de entorno ${name} debe ser un entero positivo.`);
  }

  return value;
}
