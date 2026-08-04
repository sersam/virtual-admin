import type {
  ChatAgent,
  CommunityNoticeDraftResponse,
  DocumentQueryResponse,
  IncidentPriority,
  IncidentType,
  MeetingAgendaDraftResponse,
  MeetingMinutesDraftResponse,
} from '@admin/contracts';
import {
  calculateClassificationMetrics,
  calculateMacroScore,
  calculateMean,
  calculateSetMetrics,
  countConceptCoverage,
  round,
  scoreOrderedIds,
} from './evaluationMetrics.js';
import {
  evaluationCapabilities,
  type AgendaEvaluationCase,
  type CoordinationEvaluationCase,
  type EvaluationCapability,
  type EvaluationDatasets,
  type IncidentEvaluationCase,
  type MinutesEvaluationCase,
  type NoticeEvaluationCase,
  type RagEvaluationCase,
} from './evaluationTypes.js';

export type EvaluationMode = 'demo' | 'openai';

export interface EvaluationPorts {
  readonly answerDocumentQuestion: (testCase: RagEvaluationCase) => Promise<DocumentQueryResponse>;
  readonly classifyChatIntent: (testCase: CoordinationEvaluationCase) => Promise<ChatAgent>;
  readonly createIncident: (testCase: IncidentEvaluationCase) => Promise<IncidentEvaluationOutput>;
  readonly draftCommunityNotice: (
    testCase: NoticeEvaluationCase,
  ) => Promise<CommunityNoticeDraftResponse>;
  readonly draftMeetingAgenda: (
    testCase: AgendaEvaluationCase,
  ) => Promise<MeetingAgendaDraftResponse>;
  readonly draftMeetingMinutes: (
    testCase: MinutesEvaluationCase,
  ) => Promise<MeetingMinutesDraftResponse>;
}

export interface IncidentEvaluationOutput {
  readonly incident: {
    readonly priority: IncidentPriority;
    readonly suggestedNotice: string;
    readonly type: IncidentType;
  };
}

export interface EvaluationRunInput {
  readonly commit: string;
  readonly datasets: EvaluationDatasets;
  readonly generatedAt?: Date;
  readonly mode: EvaluationMode;
  readonly ports: EvaluationPorts;
  readonly telemetry?: readonly EvaluationTelemetrySummary[];
}

export interface EvaluationCaseResult {
  readonly capability: EvaluationCapability;
  readonly error?: string;
  readonly forbiddenClaims: number;
  readonly id: string;
  readonly metrics: Record<string, number>;
  readonly passed: boolean;
  readonly score: number;
  readonly technicalError: boolean;
}

export interface EvaluationCapabilityResult {
  readonly capability: EvaluationCapability;
  readonly forbiddenClaims: number;
  readonly metrics: Record<string, number>;
  readonly score: number;
  readonly technicalErrors: number;
  readonly totalCases: number;
}

export interface EvaluationTelemetrySummary {
  readonly cachedInputTokens: number;
  readonly estimatedCostUsd: number;
  readonly inputTokens: number;
  readonly latencyMs: number;
  readonly model: string;
  readonly operation: string;
  readonly outputTokens: number;
  readonly promptVersion: string;
  readonly result: string;
}

export interface EvaluationRunResult {
  readonly capabilities: readonly EvaluationCapabilityResult[];
  readonly cases: readonly EvaluationCaseResult[];
  readonly commit: string;
  readonly datasetVersion: string;
  readonly durationMs: number;
  readonly forbiddenClaims: number;
  readonly generatedAt: string;
  readonly macroScore: number;
  readonly mode: EvaluationMode;
  readonly reportSchemaVersion: 'evaluation-report/v1';
  readonly technicalErrors: number;
  readonly telemetry: readonly EvaluationTelemetrySummary[];
  readonly totalCases: number;
}

const datasetVersion = '2026-08-04';

export async function runEvaluation(input: EvaluationRunInput): Promise<EvaluationRunResult> {
  const generatedAt = input.generatedAt ?? new Date();
  const startedAt = Date.now();
  const cases: EvaluationCaseResult[] = [];

  for (const capability of evaluationCapabilities) {
    for (const testCase of input.datasets[capability]) {
      cases.push(await evaluateCase(capability, testCase, input.ports));
    }
  }

  const capabilities = evaluationCapabilities.map((capability) =>
    aggregateCapability(
      capability,
      cases.filter((testCase) => testCase.capability === capability),
    ),
  );

  return {
    capabilities,
    cases,
    commit: input.commit,
    datasetVersion,
    durationMs: Math.max(Date.now() - startedAt, 0),
    forbiddenClaims: cases.reduce((total, testCase) => total + testCase.forbiddenClaims, 0),
    generatedAt: generatedAt.toISOString(),
    macroScore: calculateMacroScore(capabilities),
    mode: input.mode,
    reportSchemaVersion: 'evaluation-report/v1',
    technicalErrors: cases.filter((testCase) => testCase.technicalError).length,
    telemetry: input.telemetry ?? [],
    totalCases: cases.length,
  };
}

async function evaluateCase(
  capability: EvaluationCapability,
  testCase:
    | AgendaEvaluationCase
    | CoordinationEvaluationCase
    | IncidentEvaluationCase
    | MinutesEvaluationCase
    | NoticeEvaluationCase
    | RagEvaluationCase,
  ports: EvaluationPorts,
): Promise<EvaluationCaseResult> {
  try {
    if (capability === 'rag') return await evaluateRag(testCase as RagEvaluationCase, ports);
    if (capability === 'coordinacion') {
      return await evaluateCoordination(testCase as CoordinationEvaluationCase, ports);
    }
    if (capability === 'incidencias') {
      return await evaluateIncident(testCase as IncidentEvaluationCase, ports);
    }
    if (capability === 'comunicados') {
      return await evaluateNotice(testCase as NoticeEvaluationCase, ports);
    }
    if (capability === 'actas') {
      return await evaluateMinutes(testCase as MinutesEvaluationCase, ports);
    }

    return await evaluateAgenda(testCase as AgendaEvaluationCase, ports);
  } catch (error) {
    return buildErrorCase(capability, testCase.id, error);
  }
}

async function evaluateRag(
  testCase: RagEvaluationCase,
  ports: EvaluationPorts,
): Promise<EvaluationCaseResult> {
  const response = await ports.answerDocumentQuestion(testCase);
  const actualSourceIds = response.sources.map(({ id }) => id);
  const retrieval = scoreOrderedIds(testCase.expectedSourceIds, actualSourceIds);
  const citation = calculateSetMetrics(testCase.expectedCitedSourceIds, actualSourceIds);
  const concepts = countConceptCoverage({
    forbiddenClaims: [],
    requiredConcepts: testCase.expectedFacts,
    text: response.answer,
  });
  const reciprocalRank =
    testCase.expectedSourceIds.length === 0
      ? actualSourceIds.length === 0
        ? 1
        : 0
      : calculateReciprocalRank(testCase.expectedSourceIds, actualSourceIds);
  const insufficientEvidenceAccuracy = testCase.insufficientEvidence
    ? actualSourceIds.length === 0 && concepts.requiredCoverage > 0
      ? 1
      : 0
    : 1;
  const metrics = {
    citationPrecision: citation.precision,
    citationRecall: citation.recall,
    factCoverage: concepts.requiredCoverage,
    insufficientEvidenceAccuracy,
    reciprocalRank,
    retrievalRecallAt3: retrieval.recall,
  };

  return buildScoredCase('rag', testCase.id, metrics, 0);
}

async function evaluateCoordination(
  testCase: CoordinationEvaluationCase,
  ports: EvaluationPorts,
): Promise<EvaluationCaseResult> {
  const actualAgent = await ports.classifyChatIntent(testCase);
  const metrics = {
    accuracy: actualAgent === testCase.expectedAgent ? 1 : 0,
    macroF1: calculateClassificationMetrics({
      actual: [actualAgent],
      expected: [testCase.expectedAgent],
      labels: [testCase.expectedAgent, actualAgent],
    }).macroF1,
  };

  return buildScoredCase('coordinacion', testCase.id, metrics, 0);
}

async function evaluateIncident(
  testCase: IncidentEvaluationCase,
  ports: EvaluationPorts,
): Promise<EvaluationCaseResult> {
  const response = await ports.createIncident(testCase);
  const concepts = countConceptCoverage({
    forbiddenClaims: testCase.forbiddenClaims,
    requiredConcepts: testCase.requiredNoticeConcepts,
    text: response.incident.suggestedNotice,
  });
  const categoryAccuracy = response.incident.type === testCase.expectedType ? 1 : 0;
  const priorityAccuracy = response.incident.priority === testCase.expectedPriority ? 1 : 0;
  const metrics = {
    categoryAccuracy,
    jointAccuracy: categoryAccuracy === 1 && priorityAccuracy === 1 ? 1 : 0,
    noticeCoverage: concepts.requiredCoverage,
    priorityAccuracy,
  };

  return buildScoredCase('incidencias', testCase.id, metrics, concepts.forbiddenClaimsFound.length);
}

async function evaluateNotice(
  testCase: NoticeEvaluationCase,
  ports: EvaluationPorts,
): Promise<EvaluationCaseResult> {
  const response = await ports.draftCommunityNotice(testCase);
  const concepts = countConceptCoverage({
    forbiddenClaims: testCase.forbiddenClaims,
    requiredConcepts: testCase.requiredConcepts,
    text: `${response.draft.subject}\n${response.draft.body}`,
  });
  const metrics = {
    conceptCoverage: concepts.requiredCoverage,
    structuralValidity: response.draft.subject.trim() && response.draft.body.trim() ? 1 : 0,
  };

  return buildScoredCase('comunicados', testCase.id, metrics, concepts.forbiddenClaimsFound.length);
}

async function evaluateMinutes(
  testCase: MinutesEvaluationCase,
  ports: EvaluationPorts,
): Promise<EvaluationCaseResult> {
  const response = await ports.draftMeetingMinutes(testCase);
  const agreementMetrics = calculateSetMetrics(
    testCase.expectedAgreements,
    response.draft.agreements,
  );
  const taskMetrics = calculateSetMetrics(
    testCase.expectedTasks.map(({ description }) => description),
    response.draft.tasks.map(({ description }) => description),
  );
  const concepts = countConceptCoverage({
    forbiddenClaims: testCase.forbiddenClaims,
    requiredConcepts: [],
    text: `${response.draft.body}\n${response.draft.agreements.join('\n')}\n${response.draft.tasks
      .map(({ description }) => description)
      .join('\n')}`,
  });
  const metrics = {
    agreementF1: agreementMetrics.f1,
    agreementPrecision: agreementMetrics.precision,
    agreementRecall: agreementMetrics.recall,
    assigneeDateAccuracy: calculateTaskDetailsAccuracy(testCase, response.draft.tasks),
    hallucinationRate: calculateMean([
      agreementMetrics.hallucinationRate,
      taskMetrics.hallucinationRate,
    ]),
    taskF1: taskMetrics.f1,
    taskPrecision: taskMetrics.precision,
    taskRecall: taskMetrics.recall,
  };

  return buildScoredCase('actas', testCase.id, metrics, concepts.forbiddenClaimsFound.length);
}

async function evaluateAgenda(
  testCase: AgendaEvaluationCase,
  ports: EvaluationPorts,
): Promise<EvaluationCaseResult> {
  const response = await ports.draftMeetingAgenda(testCase);
  const actualIds = response.draft.items.map(({ sourceId }) => sourceId);
  const expectedIds = testCase.expectedItems.map(({ sourceId }) => sourceId);
  const sourceMetrics = scoreOrderedIds(expectedIds, actualIds);
  const concepts = countConceptCoverage({
    forbiddenClaims: testCase.forbiddenClaims,
    requiredConcepts: testCase.expectedBodyConcepts,
    text: response.draft.body,
  });
  const metrics = {
    bodyCoverage: concepts.requiredCoverage,
    emptyAccuracy:
      testCase.emptyExpected === (response.draft.items.length === 0) &&
      (!testCase.emptyExpected || concepts.requiredCoverage > 0)
        ? 1
        : 0,
    orderAccuracy: sourceMetrics.orderAccuracy,
    sourcePrecision: sourceMetrics.precision,
    sourceRecall: sourceMetrics.recall,
  };

  return buildScoredCase('juntas', testCase.id, metrics, concepts.forbiddenClaimsFound.length);
}

function buildScoredCase(
  capability: EvaluationCapability,
  id: string,
  metrics: Record<string, number>,
  forbiddenClaims: number,
): EvaluationCaseResult {
  const score = calculateMean(
    Object.entries(metrics).map(([metricName, value]) =>
      metricName.endsWith('Rate') ? 1 - value : value,
    ),
  );

  return {
    capability,
    forbiddenClaims,
    id,
    metrics,
    passed: score === 1 && forbiddenClaims === 0,
    score,
    technicalError: false,
  };
}

function buildErrorCase(
  capability: EvaluationCapability,
  id: string,
  error: unknown,
): EvaluationCaseResult {
  return {
    capability,
    error: sanitizeError(error),
    forbiddenClaims: 0,
    id,
    metrics: {},
    passed: false,
    score: 0,
    technicalError: true,
  };
}

function aggregateCapability(
  capability: EvaluationCapability,
  cases: readonly EvaluationCaseResult[],
): EvaluationCapabilityResult {
  return {
    capability,
    forbiddenClaims: cases.reduce((total, testCase) => total + testCase.forbiddenClaims, 0),
    metrics: aggregateMetrics(cases),
    score: calculateMean(cases.map(({ score }) => score)),
    technicalErrors: cases.filter((testCase) => testCase.technicalError).length,
    totalCases: cases.length,
  };
}

function aggregateMetrics(cases: readonly EvaluationCaseResult[]): Record<string, number> {
  const metricNames = [...new Set(cases.flatMap(({ metrics }) => Object.keys(metrics)))].sort();

  return Object.fromEntries(
    metricNames.map((metricName) => [
      metricName,
      calculateMean(cases.map(({ metrics }) => metrics[metricName] ?? 0)),
    ]),
  );
}

function calculateReciprocalRank(
  expectedSourceIds: readonly string[],
  actualSourceIds: readonly string[],
): number {
  const rankIndex = actualSourceIds.findIndex((sourceId) => expectedSourceIds.includes(sourceId));

  return rankIndex < 0 ? 0 : round(1 / (rankIndex + 1));
}

function calculateTaskDetailsAccuracy(
  testCase: MinutesEvaluationCase,
  actualTasks: readonly {
    readonly assignee?: string;
    readonly description: string;
    readonly dueDate?: string;
  }[],
): number {
  if (testCase.expectedTasks.length === 0) return actualTasks.length === 0 ? 1 : 0;

  const scores = testCase.expectedTasks.map((expectedTask) => {
    const actualTask = actualTasks.find(({ description }) =>
      descriptionsMatch(description, expectedTask.description),
    );
    if (!actualTask) return 0;

    const expectedDetails = [expectedTask.assignee, expectedTask.dueDate].filter(Boolean);
    if (expectedDetails.length === 0) return 1;

    const matchedDetails = expectedDetails.filter((detail) => {
      const actualValue =
        detail === expectedTask.assignee ? actualTask.assignee : actualTask.dueDate;

      return actualValue ? descriptionsMatch(actualValue, detail) : false;
    });

    return matchedDetails.length / expectedDetails.length;
  });

  return calculateMean(scores);
}

function descriptionsMatch(actual: string, expected: string): boolean {
  const actualTerms = new Set(
    actual
      .toLocaleLowerCase('es')
      .split(/[^a-z0-9]+/u)
      .filter(Boolean),
  );
  const expectedTerms = expected
    .toLocaleLowerCase('es')
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);

  return expectedTerms.length > 0 && expectedTerms.every((term) => actualTerms.has(term));
}

function sanitizeError(error: unknown): string {
  const name = error instanceof Error ? error.name : 'Error';
  const message = error instanceof Error ? error.message : String(error);
  const hasSecret = /sk-[a-z0-9_-]+/iu.test(message);
  const suffix = hasSecret ? ' Se ocultaron valores sensibles.' : '';

  return `Error tecnico (${name}).${suffix}`;
}
