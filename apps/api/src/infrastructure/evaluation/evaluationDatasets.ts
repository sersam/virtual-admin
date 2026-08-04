import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ChatAgentSchema,
  CommunityNoticeAudienceSchema,
  CommunityNoticeToneSchema,
  CommunityNoticeTypeSchema,
  DocumentSourceSchema,
  IncidentPrioritySchema,
  IncidentStatusSchema,
  IncidentTypeSchema,
  MeetingAgendaItemSourceTypeSchema,
} from '@admin/contracts';
import { z } from 'zod';
import {
  evaluationCapabilities,
  type EvaluationCapability,
  type EvaluationDatasets,
} from '../../application/evaluation/evaluationTypes.js';

export { evaluationCapabilities };

const schemaVersion = 'evaluation-dataset/v1';
const datasetVersion = '2026-08-04';

const communityDocumentSchema = z.object({
  content: z.string().trim().min(1),
  documentUrl: z.string().trim().min(1),
  id: z.string().trim().min(1),
  section: z.string().trim().min(1),
  title: z.string().trim().min(1),
  type: DocumentSourceSchema.shape.type,
});

const ragCaseSchema = z
  .object({
    documents: z.array(communityDocumentSchema).min(1),
    expectedCitedSourceIds: z.array(z.string().trim().min(1)),
    expectedFacts: z.array(z.string().trim().min(1)),
    expectedSourceIds: z.array(z.string().trim().min(1)),
    id: z.string().trim().min(1),
    insufficientEvidence: z.boolean(),
    question: z.string().trim().min(3),
  })
  .strict()
  .refine(
    (testCase) =>
      testCase.expectedCitedSourceIds.every((sourceId) =>
        testCase.expectedSourceIds.includes(sourceId),
      ),
    'Las citas esperadas deben estar entre las fuentes esperadas.',
  );

const coordinationCaseSchema = z
  .object({
    expectedAgent: ChatAgentSchema,
    id: z.string().trim().min(1),
    message: z.string().trim().min(3),
  })
  .strict();

const incidentCaseSchema = z
  .object({
    description: z.string().trim().min(10),
    expectedPriority: IncidentPrioritySchema,
    expectedType: IncidentTypeSchema,
    forbiddenClaims: z.array(z.string().trim().min(1)),
    id: z.string().trim().min(1),
    requiredNoticeConcepts: z.array(z.string().trim().min(1)),
  })
  .strict();

const noticeCaseSchema = z
  .object({
    forbiddenClaims: z.array(z.string().trim().min(1)),
    id: z.string().trim().min(1),
    input: z
      .object({
        audience: CommunityNoticeAudienceSchema,
        subject: z.string().trim().min(3).max(120),
        tone: CommunityNoticeToneSchema,
        type: CommunityNoticeTypeSchema,
      })
      .strict(),
    requiredConcepts: z.array(z.string().trim().min(1)),
  })
  .strict();

const minutesTaskSchema = z
  .object({
    assignee: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1),
    dueDate: z.string().trim().min(1).optional(),
  })
  .strict();

const minutesCaseSchema = z
  .object({
    expectedAgreements: z.array(z.string().trim().min(1)),
    expectedTasks: z.array(minutesTaskSchema),
    forbiddenClaims: z.array(z.string().trim().min(1)),
    id: z.string().trim().min(1),
    notes: z.string().trim().min(10),
  })
  .strict();

const agendaSeedIncidentSchema = z
  .object({
    createdAt: z.iso.datetime(),
    description: z.string().trim().min(10),
    id: z.string().trim().min(1),
    priority: IncidentPrioritySchema,
    status: IncidentStatusSchema,
    type: IncidentTypeSchema,
  })
  .strict();

const agendaSeedPendingAgreementSchema = z
  .object({
    assignee: z.string().trim().min(1).optional(),
    createdAt: z.iso.datetime(),
    description: z.string().trim().min(1),
    dueDate: z.string().trim().min(1).optional(),
    id: z.string().trim().min(1),
  })
  .strict();

const agendaSeedProposalSchema = z
  .object({
    createdAt: z.iso.datetime(),
    description: z.string().trim().min(1),
    id: z.string().trim().min(1),
  })
  .strict();

const agendaExpectedItemSchema = z
  .object({
    sourceId: z.string().trim().min(1),
    sourceType: MeetingAgendaItemSourceTypeSchema,
  })
  .strict();

const agendaCaseSchema = z
  .object({
    emptyExpected: z.boolean(),
    expectedBodyConcepts: z.array(z.string().trim().min(1)),
    expectedItems: z.array(agendaExpectedItemSchema),
    forbiddenClaims: z.array(z.string().trim().min(1)),
    id: z.string().trim().min(1),
    meetingId: z.string().trim().min(1),
    seed: z
      .object({
        incidents: z.array(agendaSeedIncidentSchema),
        pendingAgreements: z.array(agendaSeedPendingAgreementSchema),
        proposals: z.array(agendaSeedProposalSchema),
      })
      .strict(),
  })
  .strict()
  .refine(
    (testCase) => testCase.emptyExpected === (testCase.expectedItems.length === 0),
    'emptyExpected debe coincidir con la ausencia de elementos esperados.',
  );

const caseSchemas = {
  actas: minutesCaseSchema,
  comunicados: noticeCaseSchema,
  coordinacion: coordinationCaseSchema,
  incidencias: incidentCaseSchema,
  juntas: agendaCaseSchema,
  rag: ragCaseSchema,
} as const;

const datasetFileSchema = z.discriminatedUnion('capability', [
  buildDatasetFileSchema('actas', caseSchemas.actas),
  buildDatasetFileSchema('comunicados', caseSchemas.comunicados),
  buildDatasetFileSchema('coordinacion', caseSchemas.coordinacion),
  buildDatasetFileSchema('incidencias', caseSchemas.incidencias),
  buildDatasetFileSchema('juntas', caseSchemas.juntas),
  buildDatasetFileSchema('rag', caseSchemas.rag),
]);

export interface EvaluationDatasetValidationSummary {
  readonly capabilities: readonly EvaluationCapability[];
  readonly casesByCapability: Record<EvaluationCapability, number>;
  readonly datasetVersion: string;
  readonly schemaVersion: string;
  readonly totalCases: number;
}

export interface EvaluationDatasetBundle {
  readonly datasets: EvaluationDatasets;
  readonly summary: EvaluationDatasetValidationSummary;
}

type DatasetFile = {
  [Capability in EvaluationCapability]: {
    readonly capability: Capability;
    readonly cases: EvaluationDatasets[Capability];
  };
}[EvaluationCapability];

export async function loadEvaluationDatasetBundle(
  directory = getDefaultDatasetDirectory(),
): Promise<EvaluationDatasetBundle> {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right));
  const datasets = createEmptyDatasets();

  for (const file of files) {
    const content = await readFile(join(directory, file), 'utf8');
    const parsedJson = parseJson(content, file);
    const parsedDataset = datasetFileSchema.safeParse(parsedJson);
    if (!parsedDataset.success) {
      throw new Error(`${file}: dataset invalido: ${parsedDataset.error.message}`);
    }

    const dataset = parsedDataset.data as DatasetFile;
    if (datasets[dataset.capability].length > 0) {
      throw new Error(`${file}: capacidad duplicada: ${dataset.capability}.`);
    }

    assignDatasetCases(datasets, dataset);
  }

  const summary = validateEvaluationDatasets(datasets);

  return { datasets, summary };
}

export async function loadEvaluationDatasets(
  directory = getDefaultDatasetDirectory(),
): Promise<EvaluationDatasets> {
  return (await loadEvaluationDatasetBundle(directory)).datasets;
}

export function validateEvaluationDatasets(
  datasets: EvaluationDatasets,
): EvaluationDatasetValidationSummary {
  const casesByCapability = Object.fromEntries(
    evaluationCapabilities.map((capability) => [capability, datasets[capability].length]),
  ) as Record<EvaluationCapability, number>;
  const missingCapability = evaluationCapabilities.find(
    (capability) => casesByCapability[capability] === 0,
  );
  if (missingCapability) {
    throw new Error(`El dataset no contiene casos para ${missingCapability}.`);
  }

  const ids = evaluationCapabilities.flatMap((capability) =>
    datasets[capability].map((testCase) => testCase.id),
  );
  const duplicatedId = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicatedId) throw new Error(`ID de evaluacion duplicado: ${duplicatedId}.`);

  return {
    capabilities: evaluationCapabilities,
    casesByCapability,
    datasetVersion,
    schemaVersion,
    totalCases: ids.length,
  };
}

function buildDatasetFileSchema<T extends z.ZodTypeAny>(
  capability: EvaluationCapability,
  caseSchema: T,
) {
  return z
    .object({
      capability: z.literal(capability),
      cases: z.array(caseSchema),
      datasetVersion: z.literal(datasetVersion),
      schemaVersion: z.literal(schemaVersion),
    })
    .strict();
}

function getDefaultDatasetDirectory(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../evaluation/datasets/v1');
}

function parseJson(content: string, file: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`${file}: JSON invalido.`);
  }
}

function createEmptyDatasets(): MutableEvaluationDatasets {
  return {
    actas: [],
    comunicados: [],
    coordinacion: [],
    incidencias: [],
    juntas: [],
    rag: [],
  };
}

function assignDatasetCases(datasets: MutableEvaluationDatasets, dataset: DatasetFile): void {
  switch (dataset.capability) {
    case 'actas':
      datasets.actas = dataset.cases;
      return;
    case 'comunicados':
      datasets.comunicados = dataset.cases;
      return;
    case 'coordinacion':
      datasets.coordinacion = dataset.cases;
      return;
    case 'incidencias':
      datasets.incidencias = dataset.cases;
      return;
    case 'juntas':
      datasets.juntas = dataset.cases;
      return;
    case 'rag':
      datasets.rag = dataset.cases;
  }
}

type MutableEvaluationDatasets = {
  -readonly [Capability in keyof EvaluationDatasets]: EvaluationDatasets[Capability];
};
