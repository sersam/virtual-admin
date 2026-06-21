import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readFragment, validTypes } from './changelog-lib.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const normalized = arg.replace(/^--/, '');
    const separator = normalized.indexOf('=');
    return separator === -1
      ? [normalized, '']
      : [normalized.slice(0, separator), normalized.slice(separator + 1)];
  }),
);
const pr = args.pr ?? 'local';
const url = args.url ?? '';
const title = args.title ?? 'Cambios integrados';
const files = (await readdir('.changes')).filter((file) => file.endsWith('.md'));
const fragments = files.length
  ? await Promise.all(
      files.map(async (file) => ({ file, ...(await readFragment(join('.changes', file))) })),
    )
  : [{ file: null, type: 'Changed', summary: title }];
const grouped = new Map(validTypes.map((type) => [type, []]));
for (const fragment of fragments) grouped.get(fragment.type).push(fragment.summary);
const reference = url ? `[#${pr}](${url})` : `#${pr}`;
const entry = [
  `## ${new Date().toISOString().slice(0, 10)} · PR ${reference}`,
  ...validTypes.flatMap((type) => {
    const items = grouped.get(type);
    return items.length ? [`\n### ${type}\n`, ...items.map((item) => `- ${item}`)] : [];
  }),
  '',
].join('\n');
const changelog = await readFile('CHANGELOG.md', 'utf8');
await writeFile(
  'CHANGELOG.md',
  changelog.replace('## [Unreleased]\n', `## [Unreleased]\n\n${entry}`),
);
await Promise.all(
  fragments.filter(({ file }) => file).map(({ file }) => unlink(join('.changes', file))),
);
