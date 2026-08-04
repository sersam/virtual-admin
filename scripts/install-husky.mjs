import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const hostedEnvironmentVariables = ['CI', 'VERCEL', 'RAILWAY_ENVIRONMENT', 'RAILWAY_SERVICE_ID'];

export function shouldSkipHuskyInstall(environment = process.env) {
  const omit = environment.npm_config_omit ?? '';

  return (
    hostedEnvironmentVariables.some((name) => environment[name]) ||
    environment.npm_config_production === 'true' ||
    omit
      .split(',')
      .map((value) => value.trim())
      .includes('dev')
  );
}

function resolveHuskyBin() {
  return process.platform === 'win32' ? 'node_modules/.bin/husky.cmd' : 'node_modules/.bin/husky';
}

export function installHusky() {
  if (shouldSkipHuskyInstall()) {
    process.stdout.write('Instalacion de Husky omitida en entorno de despliegue.\n');
    return 0;
  }

  const huskyBin = resolveHuskyBin();

  if (!existsSync(huskyBin)) {
    process.stdout.write('Instalacion de Husky omitida: binario local no disponible.\n');
    return 0;
  }

  const result = spawnSync(huskyBin, { stdio: 'inherit' });

  return result.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = installHusky();
}
