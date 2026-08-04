import type { EvaluationCapability } from './evaluationTypes.js';

export interface ConceptCoverageResult {
  readonly forbiddenClaimRate: number;
  readonly forbiddenClaimsFound: readonly string[];
  readonly requiredConceptsFound: readonly string[];
  readonly requiredCoverage: number;
}

export interface SetMetrics {
  readonly f1: number;
  readonly hallucinationRate: number;
  readonly precision: number;
  readonly recall: number;
}

export interface ClassificationMetrics {
  readonly accuracy: number;
  readonly macroF1: number;
}

export interface OrderedIdScore {
  readonly orderAccuracy: number;
  readonly precision: number;
  readonly recall: number;
}

export interface CapabilityScore {
  readonly capability: EvaluationCapability;
  readonly forbiddenClaims: number;
  readonly score: number;
  readonly technicalErrors: number;
}

export interface EvaluationGateConfig {
  readonly minimumScores: Partial<Record<EvaluationCapability, number>>;
  readonly requireNoForbiddenClaims: boolean;
  readonly requireNoTechnicalErrors: boolean;
}

export interface EvaluationGateResult {
  readonly failures: readonly string[];
  readonly passed: boolean;
}

export function normalizeSpanishText(text: string): string {
  return text
    .replaceAll('º', 'o')
    .replaceAll('ª', 'a')
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
    .replaceAll(/[^a-z0-9]+/gu, ' ')
    .trim();
}

export function countConceptCoverage(input: {
  readonly forbiddenClaims: readonly string[];
  readonly requiredConcepts: readonly string[];
  readonly text: string;
}): ConceptCoverageResult {
  const normalizedText = normalizeSpanishText(input.text);
  const requiredConceptsFound = input.requiredConcepts.filter((concept) =>
    includesNormalizedConcept(normalizedText, concept),
  );
  const forbiddenClaimsFound = input.forbiddenClaims.filter((claim) =>
    includesNormalizedConcept(normalizedText, claim),
  );

  return {
    forbiddenClaimRate: ratio(forbiddenClaimsFound.length, input.forbiddenClaims.length),
    forbiddenClaimsFound,
    requiredConceptsFound,
    requiredCoverage: ratio(requiredConceptsFound.length, input.requiredConcepts.length),
  };
}

export function calculateSetMetrics(
  expectedItems: readonly string[],
  actualItems: readonly string[],
): SetMetrics {
  if (expectedItems.length === 0 && actualItems.length === 0) {
    return { f1: 1, hallucinationRate: 0, precision: 1, recall: 1 };
  }

  const expected = new Set(expectedItems.map(normalizeSpanishText));
  const actual = new Set(actualItems.map(normalizeSpanishText));
  const truePositives = [...actual].filter((item) => expected.has(item)).length;
  const precision = ratio(truePositives, actual.size);
  const recall = ratio(truePositives, expected.size);

  return {
    f1: precision + recall === 0 ? 0 : round((2 * precision * recall) / (precision + recall)),
    hallucinationRate: actual.size === 0 ? 0 : round((actual.size - truePositives) / actual.size),
    precision,
    recall,
  };
}

export function calculateClassificationMetrics(input: {
  readonly actual: readonly string[];
  readonly expected: readonly string[];
  readonly labels: readonly string[];
}): ClassificationMetrics {
  const compared = input.expected.map((expected, index) => ({
    actual: input.actual[index],
    expected,
  }));
  const accuracy = ratio(
    compared.filter(({ actual, expected }) => actual === expected).length,
    compared.length,
  );
  const f1Scores = input.labels.map((label) => {
    const truePositives = compared.filter(
      ({ actual, expected }) => actual === label && expected === label,
    ).length;
    const falsePositives = compared.filter(
      ({ actual, expected }) => actual === label && expected !== label,
    ).length;
    const falseNegatives = compared.filter(
      ({ actual, expected }) => actual !== label && expected === label,
    ).length;
    const precision = ratio(truePositives, truePositives + falsePositives);
    const recall = ratio(truePositives, truePositives + falseNegatives);

    return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  });

  return {
    accuracy,
    macroF1: round(calculateMean(f1Scores)),
  };
}

export function scoreOrderedIds(
  expectedIds: readonly string[],
  actualIds: readonly string[],
): OrderedIdScore {
  const setMetrics = calculateSetMetrics(expectedIds, actualIds);
  const comparedLength = Math.max(expectedIds.length, actualIds.length);
  const orderedMatches = expectedIds.filter((expectedId, index) => actualIds[index] === expectedId);

  return {
    orderAccuracy: ratio(orderedMatches.length, comparedLength),
    precision: setMetrics.precision,
    recall: setMetrics.recall,
  };
}

export function calculateMacroScore(scores: readonly CapabilityScore[]): number {
  return round(calculateMean(scores.map(({ score }) => score)));
}

export function evaluateCapabilityGates(
  scores: readonly CapabilityScore[],
  config: EvaluationGateConfig,
): EvaluationGateResult {
  const failures: string[] = [];

  for (const score of scores) {
    const minimumScore = config.minimumScores[score.capability];
    if (minimumScore !== undefined && score.score < minimumScore) {
      failures.push(
        `${score.capability} queda en ${formatScore(score.score)} y exige ${formatScore(
          minimumScore,
        )}.`,
      );
    }
    if (config.requireNoTechnicalErrors && score.technicalErrors > 0) {
      failures.push(`${score.capability} registra ${score.technicalErrors} errores tecnicos.`);
    }
    if (config.requireNoForbiddenClaims && score.forbiddenClaims > 0) {
      failures.push(
        `${score.capability} registra ${score.forbiddenClaims} afirmaciones prohibidas.`,
      );
    }
  }

  return { failures, passed: failures.length === 0 };
}

export function calculateMean(values: readonly number[]): number {
  if (values.length === 0) return 0;

  return round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function round(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 100) / 100;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;

  return round(numerator / denominator);
}

function includesNormalizedConcept(normalizedText: string, concept: string): boolean {
  const normalizedConcept = normalizeSpanishText(concept);

  return normalizedConcept.length > 0 && normalizedText.includes(normalizedConcept);
}

function formatScore(score: number): string {
  return score.toFixed(2);
}
