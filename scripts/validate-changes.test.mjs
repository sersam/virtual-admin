import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

test('informa cero fragmentos sin traza cuando falta .changes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'admin-changes-'));

  try {
    const result = spawnSync(process.execPath, [resolve('scripts/validate-changes.mjs')], {
      cwd: directory,
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /encontrados: 0/);
    assert.doesNotMatch(result.stderr, /ENOENT|node:internal|\s+at\s+/);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
