import { pathToFileURL } from 'node:url';

const DEFAULT_TIMEOUT_MS = 10_000;
const SESSION_COOKIE_NAME = 'va_session';

export class PublicSmokeError extends Error {
  constructor(step, message, details = {}) {
    super(`${step}: ${message}`);
    this.name = 'PublicSmokeError';
    this.step = step;
    this.details = details;
  }
}

export async function runPublicSmoke({
  apiUrl = process.env.PUBLIC_API_URL,
  fetchFn = globalThis.fetch,
  now = () => new Date(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  webUrl = process.env.PUBLIC_WEB_URL,
} = {}) {
  if (typeof fetchFn !== 'function') {
    throw new PublicSmokeError('configuracion', 'fetch no esta disponible en este entorno.');
  }

  const apiBaseUrl = normalizeBaseUrl(apiUrl, 'PUBLIC_API_URL');
  const webBaseUrl = normalizeBaseUrl(webUrl, 'PUBLIC_WEB_URL');
  const context = { apiBaseUrl, fetchFn, timeoutMs, webBaseUrl };

  const health = await checkApiHealth(context);
  const frontend = await checkFrontend(context);
  const session = await checkSessionProxy(context);
  const demoSeed = await checkDemoSeed(context, session.cookieHeader);
  const agendaSummary = await checkMeetingAgenda(
    context,
    session.cookieHeader,
    demoSeed.firstMeetingId,
  );
  const observability = await checkObservability(context, session.cookieHeader);

  return {
    apiUrl: apiBaseUrl,
    checkedAt: now().toISOString(),
    demoSeed: {
      incidentIdsStable: demoSeed.incidentIdsStable,
      incidents: demoSeed.incidentCount,
      meetings: demoSeed.meetingCount,
    },
    frontend,
    health,
    meetingAgenda: agendaSummary,
    observability,
    ok: true,
    proxy: {
      secureCookie: true,
      sessionMode: session.mode,
    },
    webUrl: webBaseUrl,
  };
}

async function checkApiHealth({ apiBaseUrl, fetchFn, timeoutMs }) {
  const health = await fetchJson(fetchFn, joinUrl(apiBaseUrl, '/health'), {
    step: 'health de API',
    timeoutMs,
  });
  assertHealth(health.body);

  return {
    service: health.body.service,
    status: health.body.status,
    version: health.body.version,
  };
}

async function checkFrontend({ fetchFn, timeoutMs, webBaseUrl }) {
  const home = await fetchHtml(fetchFn, joinUrl(webBaseUrl, '/'), {
    step: 'portada Vercel',
    timeoutMs,
  });
  const deepRoute = await fetchHtml(fetchFn, joinUrl(webBaseUrl, '/documentos'), {
    step: 'ruta profunda Vercel',
    timeoutMs,
  });

  return {
    deepRouteStatus: deepRoute.response.status,
    homeStatus: home.response.status,
  };
}

async function checkSessionProxy({ fetchFn, timeoutMs, webBaseUrl }) {
  const sessionResponse = await fetchJson(fetchFn, joinUrl(webBaseUrl, '/api/session'), {
    step: 'proxy de sesion',
    timeoutMs,
  });
  if (sessionResponse.body?.mode !== 'api') {
    throw new PublicSmokeError('proxy de sesion', 'el proxy no devolvio mode: api.');
  }

  const sessionCookie = readSecureSessionCookie(sessionResponse.response);
  return {
    cookieHeader: `${sessionCookie.name}=${sessionCookie.value}`,
    mode: sessionResponse.body.mode,
  };
}

async function checkDemoSeed({ fetchFn, timeoutMs, webBaseUrl }, cookieHeader) {
  const firstIncidents = await fetchJson(fetchFn, joinUrl(webBaseUrl, '/api/incidents'), {
    cookieHeader,
    step: 'seed de incidencias inicial',
    timeoutMs,
  });
  const secondIncidents = await fetchJson(fetchFn, joinUrl(webBaseUrl, '/api/incidents'), {
    cookieHeader,
    step: 'seed de incidencias idempotente',
    timeoutMs,
  });
  const incidentIdsStable = assertStableDemoIncidents(
    firstIncidents.body?.incidents,
    secondIncidents.body?.incidents,
  );

  const meetings = await fetchJson(fetchFn, joinUrl(webBaseUrl, '/api/meetings'), {
    cookieHeader,
    step: 'juntas demo',
    timeoutMs,
  });
  const meetingList = Array.isArray(meetings.body?.meetings) ? meetings.body.meetings : [];
  if (meetingList.length !== 2 || typeof meetingList[0]?.id !== 'string') {
    throw new PublicSmokeError('juntas demo', 'se esperaban exactamente dos juntas demo.');
  }

  return {
    firstMeetingId: meetingList[0].id,
    incidentCount: firstIncidents.body.incidents.length,
    incidentIdsStable,
    meetingCount: meetingList.length,
  };
}

async function checkMeetingAgenda({ fetchFn, timeoutMs, webBaseUrl }, cookieHeader, meetingId) {
  const meetingAgenda = await fetchJson(
    fetchFn,
    joinUrl(webBaseUrl, '/api/meeting-agendas/draft'),
    {
      body: { meetingId },
      cookieHeader,
      method: 'POST',
      step: 'borrador de orden del dia',
      timeoutMs,
    },
  );
  return summarizeAgenda(meetingAgenda.body);
}

async function checkObservability({ fetchFn, timeoutMs, webBaseUrl }, cookieHeader) {
  const observability = await fetchJson(fetchFn, joinUrl(webBaseUrl, '/api/observability'), {
    cookieHeader,
    step: 'observabilidad por proxy',
    timeoutMs,
  });
  const summary = observability.body?.summary;
  if (!summary || typeof summary.executions !== 'number') {
    throw new PublicSmokeError(
      'observabilidad por proxy',
      'la respuesta no contiene metricas agregadas validas.',
    );
  }

  return {
    executions: summary.executions,
    failures: summary.failures,
    fallbacks: summary.fallbacks,
  };
}

function normalizeBaseUrl(value, name) {
  if (!value?.trim()) {
    throw new PublicSmokeError('configuracion', `${name} es obligatoria.`);
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new PublicSmokeError('configuracion', `${name} debe ser una URL valida.`);
  }

  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new PublicSmokeError('configuracion', `${name} debe usar HTTP o HTTPS.`);
  }

  url.pathname = removeTrailingSlashes(url.pathname);
  url.search = '';
  url.hash = '';
  return removeTrailingSlashes(url.toString());
}

function removeTrailingSlashes(value) {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end -= 1;
  return value.slice(0, end);
}

async function fetchJson(fetchFn, url, options) {
  const response = await fetchWithTimeout(fetchFn, url, options);
  if (!response.ok) {
    throw new PublicSmokeError(options.step, 'el servicio no respondio correctamente.', {
      status: response.status,
      url,
    });
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new PublicSmokeError(options.step, 'la respuesta no es JSON valido.', {
      status: response.status,
      url,
    });
  }

  return { body, response };
}

async function fetchHtml(fetchFn, url, options) {
  const response = await fetchWithTimeout(fetchFn, url, options);
  if (!response.ok) {
    throw new PublicSmokeError(options.step, 'la pagina no cargo correctamente.', {
      status: response.status,
      url,
    });
  }

  const body = await response.text();
  if (!/<html[\s>]/i.test(body) || !body.includes('<div id="root"')) {
    throw new PublicSmokeError(options.step, 'la pagina no parece ser la SPA Vite.');
  }

  return { body, response };
}

async function fetchWithTimeout(fetchFn, url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    return await fetchFn(url, {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(options.cookieHeader ? { Cookie: options.cookieHeader } : {}),
      },
      method: options.method ?? 'GET',
      signal: controller.signal,
    });
  } catch (error) {
    throw new PublicSmokeError(options.step, 'no se pudo contactar el servicio.', {
      cause: error instanceof Error ? error.name : 'unknown',
      url,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function assertHealth(body) {
  if (
    body?.status !== 'ok' ||
    body?.service !== 'administrador-virtual-api' ||
    typeof body?.version !== 'string' ||
    body.version.trim() === ''
  ) {
    throw new PublicSmokeError('health de API', 'el contrato de healthcheck no es valido.');
  }
}

function readSecureSessionCookie(response) {
  const setCookie = readSetCookieHeaders(response).find((cookie) =>
    cookie.startsWith(`${SESSION_COOKIE_NAME}=`),
  );
  if (!setCookie) {
    throw new PublicSmokeError('proxy de sesion', 'no se recibio cookie de sesion.');
  }

  const [pair] = setCookie.split(';');
  const [name, value] = pair.split('=');
  if (name !== SESSION_COOKIE_NAME || !value) {
    throw new PublicSmokeError('proxy de sesion', 'la cookie de sesion no tiene formato valido.');
  }

  if (!/;\s*Secure(?:;|$)/i.test(setCookie)) {
    throw new PublicSmokeError('proxy de sesion', 'la demo publica debe entregar cookie segura.');
  }

  return { name, value };
}

function readSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }

  const header = response.headers.get('set-cookie');
  return header ? [header] : [];
}

function assertStableDemoIncidents(firstIncidents, secondIncidents) {
  if (!Array.isArray(firstIncidents) || !Array.isArray(secondIncidents)) {
    throw new PublicSmokeError(
      'seed de incidencias idempotente',
      'la respuesta de incidencias no es valida.',
    );
  }

  const firstIds = firstIncidents.map((incident) => incident.id).sort(compareText);
  const secondIds = secondIncidents.map((incident) => incident.id).sort(compareText);
  const uniqueIds = new Set(firstIds);
  if (
    firstIncidents.length !== 4 ||
    secondIncidents.length !== 4 ||
    uniqueIds.size !== 4 ||
    JSON.stringify(firstIds) !== JSON.stringify(secondIds)
  ) {
    throw new PublicSmokeError(
      'seed de incidencias idempotente',
      'se esperaban cuatro incidencias demo estables y sin duplicados.',
    );
  }

  return true;
}

function compareText(left, right) {
  return left.localeCompare(right);
}

function summarizeAgenda(body) {
  const items = Array.isArray(body?.draft?.items) ? body.draft.items : [];
  const incidentSources = items.filter((item) => item.sourceType === 'incident').length;
  const pendingAgreementSources = items.filter(
    (item) => item.sourceType === 'pending-agreement',
  ).length;

  if (incidentSources !== 4 || pendingAgreementSources !== 2) {
    throw new PublicSmokeError(
      'borrador de orden del dia',
      'el borrador no contiene cuatro incidencias y dos acuerdos pendientes trazables.',
    );
  }

  if (body.mode === 'deterministic-demo' && !body.fallbackReason) {
    throw new PublicSmokeError(
      'borrador de orden del dia',
      'la generacion quedo determinista sin fallback; revisa OPENAI_API_KEY en Railway.',
    );
  }

  if (body.mode !== 'openai' && !body.fallbackReason) {
    throw new PublicSmokeError(
      'borrador de orden del dia',
      'la respuesta no declara modo OpenAI ni fallback explicito.',
    );
  }

  return {
    fallbackReason: body.fallbackReason ?? null,
    incidentSources,
    mode: body.mode,
    pendingAgreementSources,
  };
}

function joinUrl(baseUrl, path) {
  return `${baseUrl}${path}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runPublicSmoke();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    if (error instanceof PublicSmokeError) {
      process.stderr.write(`${error.message}\n`);
      if (Object.keys(error.details).length > 0) {
        process.stderr.write(`${JSON.stringify(error.details, null, 2)}\n`);
      }
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
}
