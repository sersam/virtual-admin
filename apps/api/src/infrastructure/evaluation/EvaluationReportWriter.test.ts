import { mkdir, readFile } from 'node:fs/promises';
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
});

function createResult(): EvaluationRunResult {
  return {
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
}
