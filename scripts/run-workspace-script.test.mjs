import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

test('ignora directorios de workspace sin package.json', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/run-workspace-script.mjs', 'script-inexistente'],
    {
      env: process.env,
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0, result.stderr);
});
