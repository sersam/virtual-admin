import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = process.argv[2];
if (!script) throw new Error('Indica el script de workspace que debe ejecutarse.');

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('No se pudo localizar la CLI de npm desde el proceso actual.');

const childEnvironment = {
  ...process.env,
  PATH: '/usr/local/bin:/usr/bin:/bin',
};

async function workspaceDirectories(parent) {
  try {
    const entries = await readdir(parent, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => join(parent, entry.name));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

const directories = [
  ...(await workspaceDirectories('apps')),
  ...(await workspaceDirectories('packages')),
];

for (const directory of directories) {
  const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
  if (!manifest.scripts?.[script]) continue;
  const result = spawnSync(process.execPath, [npmCli, 'run', script, '--workspace', directory], {
    env: childEnvironment,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
