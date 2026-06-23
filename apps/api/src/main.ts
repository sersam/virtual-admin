import { createApiApp } from './presentation/http/createApiApp.js';
import { SystemClock } from './infrastructure/runtime/SystemClock.js';
import { UuidGenerator } from './infrastructure/runtime/UuidGenerator.js';
import { InMemorySessionRepository } from './infrastructure/session/InMemorySessionRepository.js';

const port = Number(process.env.PORT ?? 3000);
const cookieSecret = readRequiredEnvironmentVariable('COOKIE_SECRET');

const app = createApiApp({
  clock: new SystemClock(),
  cookieSecret,
  ids: new UuidGenerator(),
  repository: new InMemorySessionRepository(),
  secureCookies: process.env.NODE_ENV === 'production',
  version: '0.1.0',
});

app.listen(port, () => {
  console.warn(`API demo disponible en http://127.0.0.1:${port}`);
});

function readRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`La variable de entorno ${name} es obligatoria.`);
  return value;
}
