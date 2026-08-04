import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  evaluationCapabilities,
  loadEvaluationDatasets,
  validateEvaluationDatasets,
} from './evaluationDatasets.js';

describe('evaluationDatasets', () => {
  it('carga los datasets versionados y valida recuentos, ids unicos y cobertura', async () => {
    const datasets = await loadEvaluationDatasets();
    const summary = validateEvaluationDatasets(datasets);

    expect(summary.totalCases).toBe(48);
    expect(summary.casesByCapability).toEqual({
      actas: 6,
      comunicados: 8,
      coordinacion: 12,
      incidencias: 8,
      juntas: 6,
      rag: 8,
    });
    expect(summary.capabilities).toEqual(evaluationCapabilities);
    expect(summary.datasetVersion).toBe('2026-08-04');
  });

  it('rechaza JSON invalido antes de ejecutar casos', async () => {
    const directory = join(tmpdir(), `admin-eval-invalid-${crypto.randomUUID()}`);
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, 'rag.json'),
      JSON.stringify({
        schemaVersion: 'evaluation-dataset/v1',
        datasetVersion: '2026-08-04',
        capability: 'rag',
        cases: [{ id: 'rag-001', question: '', expectedSourceIds: [] }],
      }),
    );

    await expect(loadEvaluationDatasets(directory)).rejects.toThrow(/rag.json/u);
  });

  it('rechaza colecciones con ids duplicados o capacidades incompletas', async () => {
    const datasets = await loadEvaluationDatasets();
    const duplicated = {
      ...datasets,
      coordinacion: datasets.coordinacion.map((testCase, index) =>
        index === 0 ? { ...testCase, id: datasets.rag[0]!.id } : testCase,
      ),
    };

    expect(() => validateEvaluationDatasets(duplicated)).toThrow(/duplicado/u);
    expect(() => validateEvaluationDatasets({ ...datasets, juntas: [] })).toThrow(/juntas/u);
  });
});
