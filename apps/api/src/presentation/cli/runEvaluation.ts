import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import {
  evaluateCapabilityGates,
  type EvaluationGateConfig,
  type EvaluationGateResult,
} from '../../application/evaluation/evaluationMetrics.js';
import {
  runEvaluation,
  type EvaluationMode,
  type EvaluationRunResult,
} from '../../application/evaluation/EvaluationRunner.js';
import { loadEvaluationDatasetBundle } from '../../infrastructure/evaluation/evaluationDatasets.js';
import { writeEvaluationReports } from '../../infrastructure/evaluation/EvaluationReportWriter.js';
import { EvaluationTelemetryCollector } from '../../infrastructure/evaluation/EvaluationTelemetryCollector.js';
import { createAiProviders } from '../../infrastructure/openai/createAiProviders.js';
import { createEvaluationPorts } from './evaluationComposition.js';

const execFileAsync = promisify(execFile);

interface RunEvaluationCliOptions {
  readonly dependencies?: Partial<RunEvaluationCliDependencies>;
  readonly env?: NodeJS.ProcessEnv;
  readonly envFilePath?: string | false;
  readonly mode?: EvaluationMode;
  readonly outputDirectory?: string;
  readonly stderr?: (line: string) => void;
  readonly stdout?: (line: string) => void;
}

interface RunEvaluationCliDependencies {
  readonly createPorts: typeof createEvaluationPorts;
  readonly createProviders: typeof createAiProviders;
  readonly loadDatasetBundle: typeof loadEvaluationDatasetBundle;
  readonly resolveCommit: typeof resolveCommit;
  readonly runEvaluation: typeof runEvaluation;
  readonly writeReports: typeof writeEvaluationReports;
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
  const context = await createCliContext(options);

  if (!hasRequiredConfiguration(context)) return 1;

  try {
    return await runConfiguredEvaluation(context);
  } catch (error) {
    context.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

interface CliContext {
  readonly dependencies: RunEvaluationCliDependencies;
  readonly env: NodeJS.ProcessEnv;
  readonly mode: EvaluationMode;
  readonly outputDirectory?: string;
  readonly stderr: (line: string) => void;
  readonly stdout: (line: string) => void;
}

async function createCliContext(options: RunEvaluationCliOptions): Promise<CliContext> {
  return {
    dependencies: createDependencies(options.dependencies),
    env: await loadEvaluationEnvironment({
      env: options.env ?? process.env,
      envFilePath: options.envFilePath,
    }),
    mode: options.mode ?? parseMode(process.argv.slice(2)),
    outputDirectory: options.outputDirectory,
    stderr: options.stderr ?? ((line: string) => process.stderr.write(`${line}\n`)),
    stdout: options.stdout ?? ((line: string) => process.stdout.write(`${line}\n`)),
  };
}

function createDependencies(
  overrides: Partial<RunEvaluationCliDependencies> | undefined,
): RunEvaluationCliDependencies {
  return {
    createPorts: createEvaluationPorts,
    createProviders: createAiProviders,
    loadDatasetBundle: loadEvaluationDatasetBundle,
    resolveCommit,
    runEvaluation,
    writeReports: writeEvaluationReports,
    ...overrides,
  };
}

export async function loadEvaluationEnvironment(input: {
  readonly env: NodeJS.ProcessEnv;
  readonly envFilePath?: string | false;
}): Promise<NodeJS.ProcessEnv> {
  if (input.envFilePath === false) return { ...input.env };

  const envFile = input.envFilePath ?? resolve(process.cwd(), '.env');
  const fileEnvironment = await readEnvFile(envFile);

  return { ...fileEnvironment, ...input.env };
}

async function readEnvFile(path: string): Promise<NodeJS.ProcessEnv> {
  try {
    return parseEnvFile(await readFile(path, 'utf8'));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

export function parseEnvFile(content: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};

  for (const line of content.split(/\r?\n/u)) {
    const parsedLine = parseEnvLine(line);
    if (!parsedLine) continue;

    environment[parsedLine.key] = parsedLine.value;
  }

  return environment;
}

function parseEnvLine(line: string): { readonly key: string; readonly value: string } | undefined {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith('#')) return undefined;

  const separatorIndex = trimmedLine.indexOf('=');
  if (separatorIndex <= 0) return undefined;

  const key = trimmedLine.slice(0, separatorIndex).trim();
  const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
  if (!/^[A-Z_][A-Z0-9_]*$/u.test(key)) return undefined;

  return { key, value: unquoteEnvValue(rawValue) };
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
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
  const bundle = await context.dependencies.loadDatasetBundle();
  const providers = context.dependencies.createProviders({
    openAiApiKey: context.mode === 'openai' ? context.env.OPENAI_API_KEY : undefined,
    telemetry,
  });
  const result = await context.dependencies.runEvaluation({
    commit: await context.dependencies.resolveCommit(),
    datasets: bundle.datasets,
    datasetVersion: bundle.summary.datasetVersion,
    mode: context.mode,
    ports: context.dependencies.createPorts(providers),
  });
  const resultWithTelemetry: EvaluationRunResult = {
    ...result,
    telemetry: telemetry.snapshot(),
  };
  const gate = evaluateGate(context, resultWithTelemetry);
  const paths = await context.dependencies.writeReports(
    resultWithTelemetry,
    context.outputDirectory,
    {
      gateConfig: context.mode === 'demo' ? demoGateConfig : undefined,
    },
  );

  context.stdout(
    `Evaluacion ${context.mode} completada. Reportes: ${paths.jsonPath} y ${paths.markdownPath}.`,
  );

  return evaluateExitCode(context, resultWithTelemetry, gate);
}

function evaluateGate(
  context: CliContext,
  result: EvaluationRunResult,
): EvaluationGateResult | null {
  return context.mode === 'demo'
    ? evaluateCapabilityGates(result.capabilities, demoGateConfig)
    : null;
}

function evaluateExitCode(
  context: CliContext,
  result: EvaluationRunResult,
  gate: EvaluationGateResult | null,
): number {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runEvaluationCli();
}
