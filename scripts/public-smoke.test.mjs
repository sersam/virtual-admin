import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function loadSmokeModule() {
  return import(`./public-smoke.mjs?case=${Date.now()}-${Math.random()}`);
}

test('expone el script smoke:public en la raiz', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(packageJson.scripts['smoke:public'], 'node scripts/public-smoke.mjs');
});

test('verifica la demo publica y devuelve un resultado saneado', async () => {
  const { runPublicSmoke } = await loadSmokeModule();
  const calls = [];
  const fetchFn = createSuccessfulFetch(calls);

  const result = await runPublicSmoke({
    apiUrl: 'https://api.example.com',
    fetchFn,
    now: () => new Date('2026-08-04T10:00:00.000Z'),
    webUrl: 'https://web.example.com',
  });

  assert.equal(result.ok, true);
  assert.equal(result.health.service, 'administrador-virtual-api');
  assert.equal(result.proxy.sessionMode, 'api');
  assert.equal(result.proxy.secureCookie, true);
  assert.equal(result.demoSeed.incidents, 4);
  assert.equal(result.demoSeed.incidentIdsStable, true);
  assert.equal(result.demoSeed.meetings, 2);
  assert.equal(result.meetingAgenda.mode, 'openai');
  assert.equal(result.meetingAgenda.incidentSources, 4);
  assert.equal(result.meetingAgenda.pendingAgreementSources, 2);
  assert.equal(result.observability.executions, 1);

  const cookieCalls = calls.filter((call) =>
    ['/api/incidents', '/api/meetings', '/api/meeting-agendas/draft'].includes(call.pathname),
  );
  assert.ok(cookieCalls.every((call) => call.cookie === 'va_session=signed-session-token'));

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('signed-session-token'), false);
  assert.equal(serialized.includes('session-secret-id'), false);
  assert.equal(serialized.includes('Incidencia demo'), false);
});

test('falla si el healthcheck de la API no esta disponible', async () => {
  const { runPublicSmoke } = await loadSmokeModule();

  await assert.rejects(
    runPublicSmoke({
      apiUrl: 'https://api.example.com',
      fetchFn: async () => jsonResponse({ error: 'down' }, { status: 503 }),
      webUrl: 'https://web.example.com',
    }),
    /health de API/,
  );
});

test('falla si el proxy no entrega una cookie segura', async () => {
  const { runPublicSmoke } = await loadSmokeModule();
  const fetchFn = createSuccessfulFetch([], {
    sessionCookie: 'va_session=signed-session-token; Path=/; HttpOnly; SameSite=None',
  });

  await assert.rejects(
    runPublicSmoke({
      apiUrl: 'https://api.example.com',
      fetchFn,
      webUrl: 'https://web.example.com',
    }),
    /cookie segura/,
  );
});

test('falla si el seed canario se duplica o cambia entre listados', async () => {
  const { runPublicSmoke } = await loadSmokeModule();
  const fetchFn = createSuccessfulFetch([], {
    secondIncidents: [...demoIncidents, incident('incident-5', 'Incidencia demo duplicada')],
  });

  await assert.rejects(
    runPublicSmoke({
      apiUrl: 'https://api.example.com',
      fetchFn,
      webUrl: 'https://web.example.com',
    }),
    /cuatro incidencias demo estables/,
  );
});

test('falla si la generacion queda determinista sin fallback explicito', async () => {
  const { runPublicSmoke } = await loadSmokeModule();
  const fetchFn = createSuccessfulFetch([], {
    agendaMode: 'deterministic-demo',
  });

  await assert.rejects(
    runPublicSmoke({
      apiUrl: 'https://api.example.com',
      fetchFn,
      webUrl: 'https://web.example.com',
    }),
    /OPENAI_API_KEY/,
  );
});

const demoIncidents = [
  incident('incident-1', 'Incidencia demo 1'),
  incident('incident-2', 'Incidencia demo 2'),
  incident('incident-3', 'Incidencia demo 3'),
  incident('incident-4', 'Incidencia demo 4'),
];

function createSuccessfulFetch(calls, options = {}) {
  let incidentCalls = 0;
  const handlers = {
    'https://api.example.com/health': () =>
      jsonResponse({
        status: 'ok',
        service: 'administrador-virtual-api',
        version: '0.1.0',
      }),
    'https://web.example.com/': () =>
      htmlResponse('<!doctype html><html><body><div id="root"></div></body></html>'),
    'https://web.example.com/api/incidents': () => {
      incidentCalls += 1;
      return jsonResponse({
        incidents:
          incidentCalls === 2 && options.secondIncidents ? options.secondIncidents : demoIncidents,
      });
    },
    'https://web.example.com/api/meeting-agendas/draft': () =>
      jsonResponse(createAgendaDraftResponse(options.agendaMode ?? 'openai')),
    'https://web.example.com/api/meetings': () => jsonResponse(createMeetingsResponse()),
    'https://web.example.com/api/observability': () => jsonResponse(createObservabilityResponse()),
    'https://web.example.com/api/session': () =>
      jsonResponse(createSessionResponse(), {
        headers: {
          'set-cookie':
            options.sessionCookie ??
            'va_session=signed-session-token; Path=/; HttpOnly; Secure; SameSite=None',
        },
      }),
    'https://web.example.com/documentos': () =>
      htmlResponse('<!doctype html><html><body><div id="root"></div></body></html>'),
  };

  return async (input, init = {}) => {
    const url = new URL(String(input));
    calls.push({
      cookie: init.headers?.Cookie,
      method: init.method ?? 'GET',
      pathname: url.pathname,
    });

    return handlers[url.href]?.() ?? jsonResponse({ error: 'not-found' }, { status: 404 });
  };
}

function createSessionResponse() {
  return {
    mode: 'api',
    session: {
      createdAt: '2026-08-04T09:00:00.000Z',
      expiresAt: '2026-08-05T09:00:00.000Z',
      id: 'session-secret-id',
      lastSeenAt: '2026-08-04T10:00:00.000Z',
      requestsLimit: 120,
      requestsUsed: 1,
    },
  };
}

function createMeetingsResponse() {
  return {
    meetings: [
      {
        id: 'meeting-1',
        kind: 'ordinaria',
        scheduledAt: '2026-09-04T17:00:00.000Z',
        title: 'Junta ordinaria',
      },
      {
        id: 'meeting-2',
        kind: 'extraordinaria',
        scheduledAt: '2026-10-04T17:00:00.000Z',
        title: 'Junta extraordinaria',
      },
    ],
  };
}

function createAgendaDraftResponse(mode) {
  return {
    draft: {
      body: 'Contenido saneado que no debe imprimirse en el resultado.',
      items: [
        ...demoIncidents.map((demoIncident) => ({
          description: demoIncident.description,
          priority: demoIncident.priority,
          sourceId: demoIncident.id,
          sourceType: 'incident',
        })),
        {
          assignee: 'Administracion',
          description: 'Acuerdo pendiente 1',
          dueDate: '2026-08-30',
          priority: 'alta',
          sourceId: 'agreement-1',
          sourceType: 'pending-agreement',
        },
        {
          description: 'Acuerdo pendiente 2',
          priority: 'media',
          sourceId: 'agreement-2',
          sourceType: 'pending-agreement',
        },
      ],
      title: 'Orden del dia',
    },
    mode,
  };
}

function createObservabilityResponse() {
  return {
    byModel: [],
    byOperation: [],
    generatedAt: '2026-08-04T10:00:00.000Z',
    limits: {
      aiActionsPerIpPerDay: 100,
      aiActionsPerSessionPerDay: 20,
    },
    period: {
      day: '2026-08-04',
      endsAt: '2026-08-05T00:00:00.000Z',
      startsAt: '2026-08-04T00:00:00.000Z',
      timezone: 'UTC',
    },
    summary: {
      averageLatencyMs: 120,
      cachedInputTokens: 0,
      estimatedCostUsd: 0.01,
      executions: 1,
      failures: 0,
      fallbacks: 0,
      inputTokens: 10,
      outputTokens: 20,
      successes: 1,
      totalTokens: 30,
    },
  };
}

function incident(id, description) {
  return {
    createdAt: '2026-08-04T09:00:00.000Z',
    description,
    id,
    priority: 'media',
    resolvedAt: null,
    status: 'pendiente',
    suggestedNotice: 'Aviso saneado',
    suggestedResponsible: 'Administracion',
    type: 'otro',
  };
}

function jsonResponse(body, options = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
    status: options.status ?? 200,
  });
}

function htmlResponse(body) {
  return new Response(body, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
    status: 200,
  });
}
