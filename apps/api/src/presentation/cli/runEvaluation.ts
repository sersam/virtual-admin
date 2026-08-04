import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import {
  evaluateCapabilityGates,
  type EvaluationGateConfig,
} from '../../application/evaluation/evaluationMetrics.js';
import {
  runEvaluation,
  type EvaluationMode,
  type EvaluationRunResult,
} from '../../application/evaluation/EvaluationRunner.js';
import { loadEvaluationDatasets } from '../../infrastructure/evaluation/evaluationDatasets.js';
import { writeEvaluationReports } from '../../infrastructure/evaluation/EvaluationReportWriter.js';
import { EvaluationTelemetryCollector } from '../../infrastructure/evaluation/EvaluationTelemetryCollector.js';
import { createAiProviders } from '../../infrastructure/openai/createAiProviders.js';
import { createEvaluationPorts } from './evaluationComposition.js';

const execFileAsync = promisify(execFile);

interface RunEvaluationCliOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly mode?: EvaluationMode;
  readonly outputDirectory?: string;
  readonly stderr?: (line: string) => void;
  readonly stdout?: (line: string) => void;
}

const demoGateConfig: EvaluationGateConfig = {
  minimumScores: {
    actas: 0.9,
    comunicados: 0.9,
    coordinacion: 0.9,
    incidencias: 0.85,
    juntas: 0.9,
    rag: 0.85,
  },
  requireNoForbiddenClaims: true,
  requireNoTechnicalErrors: true,
};

export async function runEvaluationCli(options: RunEvaluationCliOptions = {}): Promise<number> {
  const context = createCliContext(options);

  if (!hasRequiredConfiguration(context)) return 1;

  try {
    return await runConfiguredEvaluation(context);
  } catch (error) {
    context.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

interface CliContext {
  readonly env: NodeJS.ProcessEnv;
  readonly mode: EvaluationMode;
  readonly outputDirectory?: string;
  readonly stderr: (line: string) => void;
  readonly stdout: (line: string) => void;
}

function createCliContext(options: RunEvaluationCliOptions): CliContext {
  return {
    env: options.env ?? process.env,
    mode: options.mode ?? parseMode(process.argv.slice(2)),
    outputDirectory: options.outputDirectory,
    stderr: options.stderr ?? ((line: string) => process.stderr.write(`${line}\n`)),
    stdout: options.stdout ?? ((line: string) => process.stdout.write(`${line}\n`)),
  };
}

function hasRequiredConfiguration(context: CliContext): boolean {
  if (context.mode === 'openai' && !context.env.OPENAI_API_KEY?.trim()) {
    context.stderr('Falta OPENAI_API_KEY para ejecutar eval:openai.');
    return false;
  }

  return true;
}

async function runConfiguredEvaluation(context: CliContext): Promise<number> {
  const telemetry = new EvaluationTelemetryCollector(context.mode);
  const datasets = await loadEvaluationDatasets();
  const providers = createAiProviders({
    openAiApiKey: context.mode === 'openai' ? context.env.OPENAI_API_KEY : undefined,
    telemetry,
  });
  const result = await runEvaluation({
    commit: await resolveCommit(),
    datasets,
    mode: context.mode,
    ports: createEvaluationPorts(providers),
  });
  const resultWithTelemetry: EvaluationRunResult = {
    ...result,
    telemetry: telemetry.snapshot(),
  };
  const paths = await writeEvaluationReports(resultWithTelemetry, context.outputDirectory);

  context.stdout(
    `Evaluacion ${context.mode} completada. Reportes: ${paths.jsonPath} y ${paths.markdownPath}.`,
  );

  return evaluateExitCode(context, result);
}

function evaluateExitCode(context: CliContext, result: EvaluationRunResult): number {
  const gate =
    context.mode === 'demo' ? evaluateCapabilityGates(result.capabilities, demoGateConfig) : null;
  if (gate && !gate.passed) {
    context.stderr(gate.failures.join('\n'));
    return 1;
  }
  if (context.mode === 'openai' && result.technicalErrors > 0) {
    context.stderr('eval:openai termino con errores tecnicos. Revisa el reporte.');
    return 1;
  }

  return 0;
}

function parseMode(args: readonly string[]): EvaluationMode {
  const mode = args[0];
  if (mode === 'demo' || mode === 'openai') return mode;

  throw new Error('Uso: runEvaluation demo|openai');
}

async function resolveCommit(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--short', 'HEAD']);
    return stdout.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function main(): Promise<void> {
  process.exitCode = await runEvaluationCli();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
