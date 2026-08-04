import { randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { EvaluationRunResult } from '../../application/evaluation/EvaluationRunner.js';
import type { EvaluationGateConfig } from '../../application/evaluation/evaluationMetrics.js';

export interface EvaluationReportPaths {
  readonly jsonPath: string;
  readonly markdownPath: string;
}

export interface EvaluationReportOptions {
  readonly gateConfig?: EvaluationGateConfig;
}

export async function writeEvaluationReports(
  result: EvaluationRunResult,
  outputDirectory = resolve(process.cwd(), 'artifacts/evaluations'),
  options: EvaluationReportOptions = {},
): Promise<EvaluationReportPaths> {
  await mkdir(outputDirectory, { recursive: true });

  const jsonPath = join(outputDirectory, `${result.mode}.json`);
  const markdownPath = join(outputDirectory, `${result.mode}.md`);

  await writeAtomic(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  await writeAtomic(markdownPath, renderMarkdownReport(result, options));

  return { jsonPath, markdownPath };
}

function renderMarkdownReport(
  result: EvaluationRunResult,
  options: EvaluationReportOptions,
): string {
  const lines = [
    `# Evaluacion automatica ${result.mode}`,
    '',
    `- Dataset: ${result.datasetVersion}`,
    `- Commit: ${result.commit}`,
    `- Generado: ${result.generatedAt}`,
    `- Duracion: ${result.durationMs} ms`,
    `- Score macro: ${formatScore(result.macroScore)}`,
    `- Errores tecnicos: ${result.technicalErrors}`,
    `- Afirmaciones prohibidas: ${result.forbiddenClaims}`,
    '',
    '## Capacidades',
    '',
    '| Capacidad | Score | Casos | Errores | Afirmaciones prohibidas |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...result.capabilities.map(
      (capability) =>
        `| ${capability.capability} | ${formatScore(capability.score)} | ${
          capability.totalCases
        } | ${capability.technicalErrors} | ${capability.forbiddenClaims} |`,
    ),
    '',
    ...renderGateThresholds(options.gateConfig),
    '',
    '## Casos fallidos',
    '',
    ...renderFailedCases(result),
    '',
    '## Limitaciones',
    '',
    '- El modo OpenAI evalua recuperacion lexica mas redaccion OpenAI; no mide pgvector.',
    '- El benchmark evita guardar claves, entradas completas y textos generados.',
    '- Las metricas de lenguaje se basan en conceptos esperados y pueden requerir revision humana para matices finos.',
  ];

  if (result.telemetry.length > 0) {
    lines.push(
      '',
      '## Telemetria OpenAI',
      '',
      '| Operacion | Modelo | Prompt | Resultado | Tokens entrada | Tokens salida | Coste USD | Latencia ms |',
      '| --- | --- | --- | --- | ---: | ---: | ---: | ---: |',
      ...result.telemetry.map(
        (event) =>
          `| ${event.operation} | ${event.model} | ${event.promptVersion} | ${event.result} | ${event.inputTokens} | ${event.outputTokens} | ${event.estimatedCostUsd.toFixed(6)} | ${event.latencyMs} |`,
      ),
    );
  }

  return `${lines.join('\n')}\n`;
}

function renderGateThresholds(gateConfig: EvaluationGateConfig | undefined): readonly string[] {
  if (!gateConfig) return [];

  return [
    '## Umbrales',
    '',
    '| Capacidad | Minimo |',
    '| --- | ---: |',
    ...Object.entries(gateConfig.minimumScores).map(
      ([capability, minimum]) => `| ${capability} | ${formatScore(minimum)} |`,
    ),
    '',
    `- Sin errores tecnicos: ${gateConfig.requireNoTechnicalErrors ? 'si' : 'no'}`,
    `- Sin afirmaciones prohibidas: ${gateConfig.requireNoForbiddenClaims ? 'si' : 'no'}`,
  ];
}

function renderFailedCases(result: EvaluationRunResult): readonly string[] {
  const failedCases = result.cases.filter((testCase) => !testCase.passed);
  if (failedCases.length === 0) return ['No hay casos fallidos.'];

  return [
    '| Caso | Capacidad | Score | Error |',
    '| --- | --- | ---: | --- |',
    ...failedCases.map(
      (testCase) =>
        `| ${testCase.id} | ${testCase.capability} | ${formatScore(testCase.score)} | ${
          testCase.error ?? '-'
        } |`,
    ),
  ];
}

async function writeAtomic(path: string, content: string): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, content, 'utf8');
  await rename(temporaryPath, path);
}

function formatScore(score: number): string {
  return score.toFixed(2);
}
