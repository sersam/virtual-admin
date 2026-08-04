import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import type { EvaluationRunResult } from '../../application/evaluation/EvaluationRunner.js';
import type { EvaluationCapability } from '../../application/evaluation/evaluationTypes.js';
import type { EvaluationDatasetBundle } from '../../infrastructure/evaluation/evaluationDatasets.js';
import { loadEvaluationEnvironment, parseEnvFile, runEvaluationCli } from './runEvaluation.js';

describe('runEvaluationCli', () => {
  it('ejecuta modo demo, ignora OPENAI_API_KEY y escribe reportes', async () => {
    const outputDirectory = join(tmpdir(), `admin-eval-cli-${crypto.randomUUID()}`);
    await mkdir(outputDirectory, { recursive: true });
    const stdout: string[] = [];

    const exitCode = await runEvaluationCli({
      env: { OPENAI_API_KEY: 'sk-no-debe-usarse' },
      envFilePath: false,
      mode: 'demo',
      outputDirectory,
      stdout: (line) => stdout.push(line),
    });

    expect(exitCode).toBe(0);
    expect(stdout.join('\n')).toContain('Evaluacion demo completada');
    expect(await readFile(join(outputDirectory, 'demo.json'), 'utf8')).toContain('"mode": "demo"');
  });

  it('falla modo OpenAI sin clave antes de ejecutar proveedores', async () => {
    const stderr: string[] = [];

    const exitCode = await runEvaluationCli({
      env: {},
      envFilePath: false,
      mode: 'openai',
      outputDirectory: join(tmpdir(), `admin-eval-cli-${crypto.randomUUID()}`),
      stderr: (line) => stderr.push(line),
    });

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('OPENAI_API_KEY');
  });

  it('lee OPENAI_API_KEY desde un .env sin sobrescribir el entorno exportado', async () => {
    const directory = join(tmpdir(), `admin-eval-env-${crypto.randomUUID()}`);
    const envFilePath = join(directory, '.env');
    await mkdir(directory, { recursive: true });
    await writeFile(
      envFilePath,
      [
        '# configuracion local',
        'OPENAI_API_KEY="sk-desde-env"',
        'DATABASE_URL=postgres://local',
      ].join('\n'),
    );

    await expect(loadEvaluationEnvironment({ env: {}, envFilePath })).resolves.toMatchObject({
      DATABASE_URL: 'postgres://local',
      OPENAI_API_KEY: 'sk-desde-env',
    });
    await expect(
      loadEvaluationEnvironment({
        env: { OPENAI_API_KEY: 'sk-exportada' },
        envFilePath,
      }),
    ).resolves.toMatchObject({
      OPENAI_API_KEY: 'sk-exportada',
    });
  });

  it('parsea .env ignorando comentarios y lineas no soportadas', () => {
    expect(
      parseEnvFile(
        ['# comentario', 'OPENAI_API_KEY=sk-local', 'clave-minuscula=no', 'EMPTY='].join('\n'),
      ),
    ).toEqual({
      EMPTY: '',
      OPENAI_API_KEY: 'sk-local',
    });
  });

  it('falla eval:demo por gate despues de escribir el reporte disponible', async () => {
    const outputDirectory = join(tmpdir(), `admin-eval-cli-gate-${crypto.randomUUID()}`);
    const stderr: string[] = [];

    const exitCode = await runEvaluationCli({
      dependencies: {
        loadDatasetBundle: async () => createDatasetBundle(),
        resolveCommit: async () => 'abc123',
        runEvaluation: async () => createResult({ mode: 'demo', ragScore: 0.5 }),
      },
      env: { OPENAI_API_KEY: 'sk-no-debe-usarse' },
      envFilePath: false,
      mode: 'demo',
      outputDirectory,
      stderr: (line) => stderr.push(line),
    });

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('rag');
    expect(await readFile(join(outputDirectory, 'demo.json'), 'utf8')).toContain('"mode": "demo"');
  });

  it('falla eval:openai con errores tecnicos despues de escribir el reporte disponible', async () => {
    const outputDirectory = join(tmpdir(), `admin-eval-cli-openai-error-${crypto.randomUUID()}`);
    const stderr: string[] = [];

    const exitCode = await runEvaluationCli({
      dependencies: {
        loadDatasetBundle: async () => createDatasetBundle(),
        resolveCommit: async () => 'abc123',
        runEvaluation: async () =>
          createResult({ mode: 'openai', ragScore: 1, technicalErrors: 1 }),
      },
      env: { OPENAI_API_KEY: 'sk-test' },
      envFilePath: false,
      mode: 'openai',
      outputDirectory,
      stderr: (line) => stderr.push(line),
    });

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('errores tecnicos');
    expect(await readFile(join(outputDirectory, 'openai.json'), 'utf8')).toContain(
      '"technicalErrors": 1',
    );
  });
});

function createDatasetBundle(): EvaluationDatasetBundle {
  return {
    datasets: {
      actas: [],
      comunicados: [],
      coordinacion: [],
      incidencias: [],
      juntas: [],
      rag: [],
    },
    summary: {
      capabilities: ['rag', 'coordinacion', 'incidencias', 'comunicados', 'actas', 'juntas'],
      casesByCapability: {
        actas: 0,
        comunicados: 0,
        coordinacion: 0,
        incidencias: 0,
        juntas: 0,
        rag: 0,
      },
      datasetVersion: '2026-08-04',
      schemaVersion: 'evaluation-dataset/v1',
      totalCases: 0,
    },
  };
}

function createResult(input: {
  readonly mode: 'demo' | 'openai';
  readonly ragScore: number;
  readonly technicalErrors?: number;
}): EvaluationRunResult {
  const capabilityNames: readonly EvaluationCapability[] = [
    'rag',
    'coordinacion',
    'incidencias',
    'comunicados',
    'actas',
    'juntas',
  ];
  const capabilities = capabilityNames.map((capability) => ({
    capability,
    forbiddenClaims: 0,
    metrics: {},
    score: capability === 'rag' ? input.ragScore : 1,
    technicalErrors: 0,
    totalCases: 1,
  }));

  return {
    capabilities,
    cases: [],
    commit: 'abc123',
    datasetVersion: '2026-08-04',
    durationMs: 1,
    forbiddenClaims: 0,
    generatedAt: '2026-08-04T10:00:00.000Z',
    macroScore: input.ragScore,
    mode: input.mode,
    reportSchemaVersion: 'evaluation-report/v1',
    technicalErrors: input.technicalErrors ?? 0,
    telemetry: [],
    totalCases: 0,
  };
}
