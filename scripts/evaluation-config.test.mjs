import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('expone scripts raiz para evaluacion demo y OpenAI', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));

  assert.equal(
    packageJson.scripts['eval:demo'],
    'tsx apps/api/src/presentation/cli/runEvaluation.ts demo',
  );
  assert.equal(
    packageJson.scripts['eval:openai'],
    'tsx apps/api/src/presentation/cli/runEvaluation.ts openai',
  );
});

test('quality ejecuta la evaluacion demo como gate bloqueante', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));

  assert.match(packageJson.scripts.quality, /npm run eval:demo/);
});

test('los reportes de evaluacion quedan fuera de Git', async () => {
  const gitignore = await readFile('.gitignore', 'utf8');

  assert.match(gitignore, /^artifacts$/m);
});

test('GitHub Actions ejecuta eval demo y sube reportes aunque falle', async () => {
  const workflow = await readFile('.github/workflows/pr-quality.yml', 'utf8');

  assert.match(workflow, /npm run eval:demo/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /artifacts\/evaluations/);
});
