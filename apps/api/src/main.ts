import { createApiApp } from './presentation/http/createApiApp.js';
import { SystemClock } from './infrastructure/runtime/SystemClock.js';
import { UuidGenerator } from './infrastructure/runtime/UuidGenerator.js';
import { InMemorySessionRepository } from './infrastructure/session/InMemorySessionRepository.js';

const port = Number(process.env.PORT ?? 3000);
const cookieSecret = process.env.COOKIE_SECRET ?? 'local-demo-cookie-secret';

const app = createApiApp({
  clock: new SystemClock(),
  cookieSecret,
  ids: new UuidGenerator(),
  repository: new InMemorySessionRepository(),
  version: '0.1.0',
});

app.listen(port, () => {
  console.warn(`API demo disponible en http://127.0.0.1:${port}`);
});
