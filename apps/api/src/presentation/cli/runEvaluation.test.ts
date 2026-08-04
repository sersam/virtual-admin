import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
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
});
