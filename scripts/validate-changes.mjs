import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { assertSingleFragment, readFragment } from './changelog-lib.mjs';

const directory = '.changes';
const files = (await readdir(directory)).filter((file) => file.endsWith('.md'));
assertSingleFragment(files);
await Promise.all(files.map((file) => readFragment(join(directory, file))));
process.stdout.write(`${files.length} fragmento(s) de changelog válido(s).\n`);
