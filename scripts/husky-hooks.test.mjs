import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldSkipHuskyInstall } from './install-husky.mjs';

test('pre-commit ejecuta los controles rápidos del workspace', async () => {
  const hook = await readFile('.husky/pre-commit', 'utf8');

  assert.match(hook, /npm run precommit:check/);
});

test('pre-push ejecuta la quality gate completa', async () => {
  const hook = await readFile('.husky/pre-push', 'utf8');

  assert.match(hook, /npm run prepush:check/);
});

test('la instalacion de Husky se omite en Vercel', () => {
  assert.equal(shouldSkipHuskyInstall({ VERCEL: '1' }), true);
});

test('la instalacion de Husky se omite cuando npm excluye devDependencies', () => {
  assert.equal(shouldSkipHuskyInstall({ npm_config_omit: 'dev' }), true);
  assert.equal(shouldSkipHuskyInstall({ npm_config_production: 'true' }), true);
});

test('la instalacion de Husky se mantiene en desarrollo local', () => {
  assert.equal(shouldSkipHuskyInstall({}), false);
});
