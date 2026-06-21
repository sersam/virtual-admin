import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSingleFragment, insertChangelogEntry, parseFragment } from './changelog-lib.mjs';

test('acepta un fragmento válido', () => {
  assert.deepEqual(parseFragment('---\ntype: Added\n---\nNueva funcionalidad completa.'), {
    type: 'Added',
    summary: 'Nueva funcionalidad completa.',
  });
});

test('rechaza tipos desconocidos', () => {
  assert.throws(() => parseFragment('---\ntype: Unknown\n---\nResumen suficientemente largo.'));
});

test('exige exactamente un fragmento por historia', () => {
  assert.doesNotThrow(() => assertSingleFragment(['us-000.md']));
  assert.throws(() => assertSingleFragment([]), /exactamente un fragmento/);
  assert.throws(() => assertSingleFragment(['a.md', 'b.md']), /encontrados: 2/);
});

test('no modifica el changelog si falta la sección Unreleased', () => {
  assert.throws(() => insertChangelogEntry('# Changelog\n', 'entrada'), /no contiene la sección/);
});

test('inserta la entrada debajo de Unreleased', () => {
  assert.equal(
    insertChangelogEntry('# Changelog\n\n## [Unreleased]\n', '## 2026-06-21'),
    '# Changelog\n\n## [Unreleased]\n\n## 2026-06-21',
  );
});
