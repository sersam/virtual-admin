import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readFragment } from './changelog-lib.mjs';

const directory = '.changes';
const files = (await readdir(directory)).filter((file) => file.endsWith('.md'));
if (!files.length) throw new Error('La rama debe incluir al menos un fragmento en .changes/.');
await Promise.all(files.map((file) => readFragment(join(directory, file))));
process.stdout.write(`${files.length} fragmento(s) de changelog válido(s).\n`);
