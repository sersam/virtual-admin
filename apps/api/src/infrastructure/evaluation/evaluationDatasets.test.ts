import { mkdir, rm, writeFile } from 'node:fs/promises';
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

  it('rechaza datasets que incumplen el schema antes de ejecutar casos', async () => {
    const directory = join(tmpdir(), `admin-eval-invalid-${crypto.randomUUID()}`);
    try {
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
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rechaza JSON malformado antes de validar el dataset', async () => {
    const directory = join(tmpdir(), `admin-eval-malformed-${crypto.randomUUID()}`);
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, 'rag.json'), '{ invalid', 'utf8');

      await expect(loadEvaluationDatasets(directory)).rejects.toThrow(/JSON invalido/u);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rechaza expectativas incoherentes en citas y casos vacios de junta', async () => {
    const invalidCitations = createDatasetFile('rag', [
      {
        documents: [createRagDocument('doc-1')],
        expectedCitedSourceIds: ['doc-2'],
        expectedFacts: ['horario'],
        expectedSourceIds: ['doc-1'],
        id: 'rag-invalid-citation',
        insufficientEvidence: false,
        question: 'Cual es el horario de la piscina?',
      },
    ]);
    const invalidEmptyAgenda = createDatasetFile('juntas', [
      {
        emptyExpected: true,
        expectedBodyConcepts: [],
        expectedItems: [{ sourceId: 'inc-1', sourceType: 'incident' }],
        forbiddenClaims: [],
        id: 'agenda-invalid-empty',
        meetingId: 'meeting-1',
        seed: { incidents: [], pendingAgreements: [], proposals: [] },
      },
    ]);

    await expectDatasetFileToFail(invalidCitations, /citas esperadas/u);
    await expectDatasetFileToFail(invalidEmptyAgenda, /emptyExpected/u);
  });

  it('rechaza archivos duplicados para la misma capacidad', async () => {
    const directory = join(tmpdir(), `admin-eval-duplicate-capability-${crypto.randomUUID()}`);
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(
        join(directory, 'a-rag.json'),
        JSON.stringify(
          createDatasetFile('rag', [
            {
              documents: [createRagDocument('doc-1')],
              expectedCitedSourceIds: ['doc-1'],
              expectedFacts: ['horario'],
              expectedSourceIds: ['doc-1'],
              id: 'rag-1',
              insufficientEvidence: false,
              question: 'Cual es el horario de la piscina?',
            },
          ]),
        ),
      );
      await writeFile(
        join(directory, 'b-rag.json'),
        JSON.stringify(
          createDatasetFile('rag', [
            {
              documents: [createRagDocument('doc-2')],
              expectedCitedSourceIds: ['doc-2'],
              expectedFacts: ['socorrista'],
              expectedSourceIds: ['doc-2'],
              id: 'rag-2',
              insufficientEvidence: false,
              question: 'Hay socorrista?',
            },
          ]),
        ),
      );

      await expect(loadEvaluationDatasets(directory)).rejects.toThrow(/capacidad duplicada/u);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
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

async function expectDatasetFileToFail(datasetFile: unknown, expectedError: RegExp): Promise<void> {
  const directory = join(tmpdir(), `admin-eval-refine-${crypto.randomUUID()}`);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'invalid.json'), JSON.stringify(datasetFile));

    await expect(loadEvaluationDatasets(directory)).rejects.toThrow(expectedError);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function createDatasetFile(capability: string, cases: readonly unknown[]): unknown {
  return {
    capability,
    cases,
    datasetVersion: '2026-08-04',
    schemaVersion: 'evaluation-dataset/v1',
  };
}

function createRagDocument(id: string): unknown {
  return {
    content: 'La piscina abre con horario de verano.',
    documentUrl: `/documents/${id}.pdf`,
    id,
    section: 'Piscina',
    title: 'Normas de piscina',
    type: 'normas',
  };
}
