import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

test('pre-commit ejecuta los controles rápidos del workspace', async () => {
  const hook = await readFile('.husky/pre-commit', 'utf8');

  assert.match(hook, /npm run precommit:check/);
});

test('pre-push ejecuta la quality gate completa', async () => {
  const hook = await readFile('.husky/pre-push', 'utf8');

  assert.match(hook, /npm run prepush:check/);
});
