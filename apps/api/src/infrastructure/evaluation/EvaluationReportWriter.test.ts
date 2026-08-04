import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import type { EvaluationRunResult } from '../../application/evaluation/EvaluationRunner.js';
import { writeEvaluationReports } from './EvaluationReportWriter.js';

describe('EvaluationReportWriter', () => {
  it('escribe reportes JSON y Markdown saneados de forma atomica', async () => {
    const directory = join(tmpdir(), `admin-eval-report-${crypto.randomUUID()}`);
    await mkdir(directory, { recursive: true });

    const paths = await writeEvaluationReports(createResult(), directory);

    const json = await readFile(paths.jsonPath, 'utf8');
    const markdown = await readFile(paths.markdownPath, 'utf8');

    expect(JSON.parse(json)).toMatchObject({ mode: 'demo', totalCases: 1 });
    expect(json).not.toContain('sk-secret');
    expect(markdown).toContain('# Evaluacion automatica demo');
    expect(markdown).toContain('| Capacidad | Score | Casos | Errores |');
    expect(markdown).toContain('rag-case');
  });

  it('incluye umbrales demo, telemetria y mensaje explicito cuando no hay casos fallidos', async () => {
    const directory = join(tmpdir(), `admin-eval-report-full-${crypto.randomUUID()}`);
    await mkdir(directory, { recursive: true });

    const paths = await writeEvaluationReports(
      createResult({
        cases: [
          {
            capability: 'rag',
            forbiddenClaims: 0,
            id: 'rag-case',
            metrics: { retrievalRecallAt3: 1 },
            passed: true,
            score: 1,
            technicalError: false,
          },
        ],
        telemetry: [
          {
            cachedInputTokens: 0,
            estimatedCostUsd: 0.00012,
            inputTokens: 100,
            latencyMs: 321,
            model: 'gpt-test',
            operation: 'notice',
            outputTokens: 40,
            promptVersion: 'notice/v1',
            result: 'success',
          },
        ],
      }),
      directory,
      {
        gateConfig: {
          minimumScores: { rag: 0.85 },
          requireNoForbiddenClaims: true,
          requireNoTechnicalErrors: true,
        },
      },
    );

    const markdown = await readFile(paths.markdownPath, 'utf8');

    expect(markdown).toContain('## Umbrales');
    expect(markdown).toContain('| rag | 0.85 |');
    expect(markdown).toContain('No hay casos fallidos.');
    expect(markdown).toContain('## Telemetria OpenAI');
    expect(markdown).toContain('gpt-test');
  });

  it('soporta escrituras concurrentes sin colisionar nombres temporales', async () => {
    const directory = join(tmpdir(), `admin-eval-report-concurrent-${crypto.randomUUID()}`);
    await mkdir(directory, { recursive: true });

    await Promise.all([
      writeEvaluationReports(createResult({ commit: 'first' }), directory),
      writeEvaluationReports(createResult({ commit: 'second' }), directory),
    ]);

    const json = await readFile(join(directory, 'demo.json'), 'utf8');

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('propaga errores de escritura del directorio de salida', async () => {
    const blockedPath = join(tmpdir(), `admin-eval-report-blocked-${crypto.randomUUID()}`);
    await writeFile(blockedPath, 'no es un directorio', 'utf8');

    try {
      await expect(
        writeEvaluationReports(createResult(), join(blockedPath, 'nested')),
      ).rejects.toThrow();
    } finally {
      await rm(blockedPath, { force: true });
    }
  });
});

function createResult(overrides: Partial<EvaluationRunResult> = {}): EvaluationRunResult {
  const result: EvaluationRunResult = {
    capabilities: [
      {
        capability: 'rag',
        forbiddenClaims: 0,
        metrics: { retrievalRecallAt3: 1 },
        score: 1,
        technicalErrors: 0,
        totalCases: 1,
      },
    ],
    cases: [
      {
        capability: 'rag',
        forbiddenClaims: 0,
        id: 'rag-case',
        metrics: { retrievalRecallAt3: 1 },
        passed: false,
        score: 0.5,
        technicalError: false,
      },
    ],
    commit: 'abc123',
    datasetVersion: '2026-08-04',
    durationMs: 12,
    forbiddenClaims: 0,
    generatedAt: '2026-08-04T10:00:00.000Z',
    macroScore: 1,
    mode: 'demo',
    reportSchemaVersion: 'evaluation-report/v1',
    technicalErrors: 0,
    telemetry: [],
    totalCases: 1,
  };

  return { ...result, ...overrides };
}
