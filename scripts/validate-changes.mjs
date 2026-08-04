import { join } from 'node:path';
import { assertSingleFragment, listMarkdownFragments, readFragment } from './changelog-lib.mjs';

const directory = '.changes';

try {
  const files = await listMarkdownFragments(directory);
  assertSingleFragment(files);
  await Promise.all(files.map((file) => readFragment(join(directory, file))));
  process.stdout.write(`${files.length} fragmento(s) de changelog válido(s).\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
