import { readFile } from 'node:fs/promises';

export const validTypes = ['Added', 'Changed', 'Fixed', 'Removed', 'Security'];
export const unreleasedAnchor = '## [Unreleased]\n';

export function assertSingleFragment(files) {
  if (files.length !== 1) {
    throw new Error(
      `La rama debe incluir exactamente un fragmento en .changes/; encontrados: ${files.length}.`,
    );
  }
}

export function insertChangelogEntry(changelog, entry) {
  if (!changelog.includes(unreleasedAnchor)) {
    throw new Error('CHANGELOG.md no contiene la sección requerida "## [Unreleased]".');
  }
  return changelog.replace(unreleasedAnchor, `${unreleasedAnchor}\n${entry}`);
}

export function parseFragment(content, filename = 'fragmento') {
  const match = content.match(/^---\s*\ntype:\s*(\w+)\s*\n---\s*\n([\s\S]+)$/);
  if (!match) throw new Error(`${filename}: formato inválido`);
  const [, type, summary] = match;
  if (!validTypes.includes(type)) throw new Error(`${filename}: tipo "${type}" no permitido`);
  if (summary.trim().length < 10) throw new Error(`${filename}: el resumen es demasiado corto`);
  return { type, summary: summary.trim() };
}

export async function readFragment(path) {
  return parseFragment(await readFile(path, 'utf8'), path);
}
