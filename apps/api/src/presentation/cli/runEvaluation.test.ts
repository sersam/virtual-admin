import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { runEvaluationCli } from './runEvaluation.js';

describe('runEvaluationCli', () => {
  it('ejecuta modo demo, ignora OPENAI_API_KEY y escribe reportes', async () => {
    const outputDirectory = join(tmpdir(), `admin-eval-cli-${crypto.randomUUID()}`);
    await mkdir(outputDirectory, { recursive: true });
    const stdout: string[] = [];

    const exitCode = await runEvaluationCli({
      env: { OPENAI_API_KEY: 'sk-no-debe-usarse' },
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
      mode: 'openai',
      outputDirectory: join(tmpdir(), `admin-eval-cli-${crypto.randomUUID()}`),
      stderr: (line) => stderr.push(line),
    });

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('OPENAI_API_KEY');
  });
});
