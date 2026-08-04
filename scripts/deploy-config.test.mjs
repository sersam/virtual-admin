import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('configura Railway para desplegar la API con migraciones y healthcheck', async () => {
  const railway = await readJson('railway.json');

  assert.equal(railway.$schema, 'https://railway.com/railway.schema.json');
  assert.equal(railway.build.builder, 'RAILPACK');
  assert.equal(railway.build.buildCommand, 'npm run build --workspace @admin/api');
  assert.equal(railway.deploy.preDeployCommand, 'npm run db:migrate');
  assert.equal(railway.deploy.startCommand, 'npm run start --workspace @admin/api');
  assert.equal(railway.deploy.healthcheckPath, '/health');
  assert.equal(railway.deploy.restartPolicyType, 'ON_FAILURE');
  assert.deepEqual(railway.deploy.watchPatterns, [
    'apps/api/**',
    'packages/**',
    'package.json',
    'package-lock.json',
  ]);
});

test('la API expone un arranque de produccion disponible en Railway', async () => {
  const packageJson = await readJson('apps/api/package.json');
  const main = await readFile('apps/api/src/main.ts', 'utf8');

  assert.equal(packageJson.scripts.start, 'tsx src/main.ts');
  assert.equal(packageJson.dependencies.tsx, '^4.21.0');
  assert.equal(packageJson.devDependencies.tsx, undefined);
  assert.match(main, /const host = '0\.0\.0\.0';/);
  assert.match(main, /app\.listen\(port,\s*host,/);
});

test('configura Vercel con proxy API y fallback SPA en ese orden', async () => {
  const config = await readJson('apps/web/vercel.json');

  assert.deepEqual(config.rewrites, [
    {
      source: '/api/:path*',
      destination: 'https://virtual-admin-production.up.railway.app/api/:path*',
    },
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ]);
});

test('publica un workflow manual para ejecutar el smoke postdespliegue', async () => {
  const workflow = await readFile('.github/workflows/public-smoke.yml', 'utf8');

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /PUBLIC_API_URL: \$\{\{ vars\.PUBLIC_API_URL \}\}/);
  assert.match(workflow, /PUBLIC_WEB_URL: \$\{\{ vars\.PUBLIC_WEB_URL \}\}/);
  assert.match(workflow, /npm run smoke:public/);
});

test('excluye los scripts raiz de la cobertura Sonar porque se prueban sin LCOV', async () => {
  const sonarProperties = await readFile('sonar-project.properties', 'utf8');

  assert.match(sonarProperties, /^sonar\.coverage\.exclusions=.*scripts\/\*\*\/\*\.mjs/m);
});
