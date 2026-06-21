import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from './changelog-lib.mjs';

test('acepta un fragmento válido', () => {
  assert.deepEqual(parseFragment('---\ntype: Added\n---\nNueva funcionalidad completa.'), {
    type: 'Added',
    summary: 'Nueva funcionalidad completa.',
  });
});

test('rechaza tipos desconocidos', () => {
  assert.throws(() => parseFragment('---\ntype: Unknown\n---\nResumen suficientemente largo.'));
});
