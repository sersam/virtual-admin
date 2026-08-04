import { describe, expect, it } from 'vitest';
import {
  calculateClassificationMetrics,
  calculateMacroScore,
  calculateSetMetrics,
  countConceptCoverage,
  evaluateCapabilityGates,
  normalizeSpanishText,
  scoreOrderedIds,
  type CapabilityScore,
} from './evaluationMetrics.js';

describe('evaluationMetrics', () => {
  it('normaliza texto en espanol para comparar conceptos sin depender de acentos o mayusculas', () => {
    expect(normalizeSpanishText('  FUGA en el Sótano, Nº 2.  ')).toBe('fuga en el sotano no 2');
  });

  it('calcula cobertura de conceptos y afirmaciones prohibidas sin divisiones NaN', () => {
    const coverage = countConceptCoverage({
      text: 'Estimados vecinos, hay una fuga de agua en el garaje y actuara fontaneria.',
      requiredConcepts: ['fuga de agua', 'garaje', 'fontaneria'],
      forbiddenClaims: ['garantia gratuita'],
    });

    expect(coverage.requiredCoverage).toBe(1);
    expect(coverage.forbiddenClaimRate).toBe(0);

    expect(
      countConceptCoverage({ text: '', requiredConcepts: [], forbiddenClaims: [] }),
    ).toMatchObject({
      requiredCoverage: 0,
      forbiddenClaimRate: 0,
    });
  });

  it('calcula precision, recall y F1 de conjuntos con divisiones vacias controladas', () => {
    expect(calculateSetMetrics(['a', 'b'], ['b', 'c'])).toMatchObject({
      f1: 0.5,
      precision: 0.5,
      recall: 0.5,
    });
    expect(calculateSetMetrics([], [])).toMatchObject({ f1: 1, precision: 1, recall: 1 });
  });

  it('calcula accuracy y macro-F1 para clasificaciones multicategoria', () => {
    const metrics = calculateClassificationMetrics({
      expected: ['documentos', 'documentos', 'actas', 'juntas'],
      actual: ['documentos', 'actas', 'actas', 'general'],
      labels: ['documentos', 'actas', 'juntas', 'general'],
    });

    expect(metrics.accuracy).toBe(0.5);
    expect(metrics.macroF1).toBeCloseTo(0.33, 2);
  });

  it('puntua orden de fuentes por precision, recall y posiciones exactas', () => {
    expect(
      scoreOrderedIds(['urgent-incident', 'pending-task'], ['urgent-incident', 'proposal']),
    ).toMatchObject({
      orderAccuracy: 0.5,
      precision: 0.5,
      recall: 0.5,
    });
  });

  it('calcula media macro y gates bloqueantes de demo', () => {
    const scores: CapabilityScore[] = [
      { capability: 'rag', score: 0.9, technicalErrors: 0, forbiddenClaims: 0 },
      { capability: 'coordinacion', score: 0.8, technicalErrors: 0, forbiddenClaims: 0 },
    ];

    expect(calculateMacroScore(scores)).toBe(0.85);
    expect(
      evaluateCapabilityGates(scores, {
        minimumScores: { rag: 0.85, coordinacion: 0.9 },
        requireNoForbiddenClaims: true,
        requireNoTechnicalErrors: true,
      }),
    ).toMatchObject({
      passed: false,
      failures: ['coordinacion queda en 0.80 y exige 0.90.'],
    });
  });
});
