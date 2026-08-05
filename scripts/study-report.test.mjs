import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function loadStudyModule() {
  return import(`./study-report.mjs?case=${Date.now()}-${Math.random()}`);
}

test('expone scripts raiz para generar y verificar el estudio', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));

  assert.equal(packageJson.scripts['study:report'], 'node scripts/study-report.mjs report');
  assert.equal(packageJson.scripts['study:check'], 'node scripts/study-report.mjs check');
  assert.match(packageJson.scripts.quality, /npm run study:check/);
});

test('calcula SUS con items impares y pares segun la formula validada', async () => {
  const { scoreSus } = await loadStudyModule();

  assert.equal(scoreSus([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
  assert.equal(scoreSus([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
  assert.equal(scoreSus([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
  assert.throws(() => scoreSus([3, 3, 3]), /10 respuestas SUS/);
  assert.throws(() => scoreSus([3, 3, 3, 3, 3, 3, 3, 3, 3, 6]), /enteros de 1 a 5/);
});

test('resume un estudio final con resultados agregados reproducibles', async () => {
  const { summarizeStudy } = await loadStudyModule();
  const summary = summarizeStudy(createFinalDataset());

  assert.equal(summary.status, 'final');
  assert.equal(summary.participants.total, 10);
  assert.deepEqual(summary.participants.byProfile, {
    administratorExperience: 5,
    ownerOrEndUser: 5,
  });
  assert.equal(summary.tasks.length, 6);
  assert.equal(summary.tasks[0].completed, 8);
  assert.equal(summary.tasks[0].partial, 1);
  assert.equal(summary.tasks[0].failed, 1);
  assert.equal(summary.tasks[0].strictCompletionRate, 0.8);
  assert.equal(summary.tasks[0].medianSeconds, 135);
  assert.equal(summary.tasks[0].withoutAssistanceRate, 0.7);
  assert.equal(summary.sus.mean, 72.5);
  assert.equal(summary.sus.median, 72.5);
  assert.equal(summary.sus.min, 50);
  assert.equal(summary.sus.max, 95);
  assert.equal(summary.sus.sampleStandardDeviation, 12.75);
  assert.deepEqual(summary.qualitativeThemes.positive, [
    { id: 'traceable-sources', count: 10 },
    { id: 'useful-drafts', count: 10 },
  ]);
});

test('valida privacidad, reparto de perfiles e IDs anonimos', async () => {
  const { summarizeStudy } = await loadStudyModule();
  const invalid = {
    ...createFinalDataset(),
    participants: [
      ...createFinalDataset().participants.slice(0, 9),
      {
        ...createParticipant('P10', 'owner-or-end-user', 80),
        email: 'persona@example.com',
      },
    ],
  };

  assert.throws(() => summarizeStudy(invalid), /campo prohibido/i);
  assert.throws(
    () =>
      summarizeStudy({
        ...createFinalDataset(),
        participants: createFinalDataset().participants.slice(0, 9),
      }),
    /P01-P10/,
  );
  assert.throws(
    () =>
      summarizeStudy({
        ...createFinalDataset(),
        participants: createFinalDataset().participants.map((participant, index) =>
          index === 0 ? { ...participant, participantId: 'PX1' } : participant,
        ),
      }),
    /P01-P10/,
  );
});

test('renderiza un informe estable y marca el estudio planificado como pendiente', async () => {
  const { renderStudyReport, summarizeStudy } = await loadStudyModule();
  const plannedSummary = summarizeStudy({
    ...createBaseDataset(),
    status: 'planned',
    participants: [],
  });
  const finalReport = renderStudyReport(summarizeStudy(createFinalDataset()));
  const plannedReport = renderStudyReport(plannedSummary);

  assert.match(finalReport, /# Resultados del estudio de usabilidad/);
  assert.match(finalReport, /SUS medio \| 72,5/);
  assert.match(finalReport, /Tarea 1: Chat y coordinacion/);
  assert.match(plannedReport, /Estado: pendiente de recogida/);
});

function createFinalDataset() {
  return {
    ...createBaseDataset(),
    status: 'final',
    participants: [
      createParticipant('P01', 'administrator-experience', 95),
      createParticipant('P02', 'administrator-experience', 85),
      createParticipant('P03', 'administrator-experience', 80),
      createParticipant('P04', 'administrator-experience', 75),
      createParticipant('P05', 'administrator-experience', 70),
      createParticipant('P06', 'owner-or-end-user', 70),
      createParticipant('P07', 'owner-or-end-user', 65),
      createParticipant('P08', 'owner-or-end-user', 60),
      createParticipant('P09', 'owner-or-end-user', 75),
      createParticipant('P10', 'owner-or-end-user', 50),
    ],
  };
}

function createBaseDataset() {
  return {
    schemaVersion: 'study-responses/v1',
    status: 'final',
    study: {
      community: 'Residencial Sierra Nevada',
      evaluatedCommit: '026d8ea',
      publicDemoUrl: 'https://demo.example.com',
      browser: 'Chrome estable de escritorio',
      collectionStartedAt: '2026-08-05',
      collectionFinishedAt: '2026-08-05',
      protocolVersion: 'us-025-study-protocol/v1',
    },
    tasks: [
      { id: 'chat-coordination', label: 'Tarea 1: Chat y coordinacion' },
      { id: 'notice-draft', label: 'Tarea 2: Comunicado editable' },
      { id: 'rag-source', label: 'Tarea 3: Consulta documental trazable' },
      { id: 'incident-notice', label: 'Tarea 4: Incidencia y comunicado sugerido' },
      { id: 'minutes-pdf', label: 'Tarea 5: Acta estructurada' },
      { id: 'agenda-traceability', label: 'Tarea 6: Orden del dia trazable' },
    ],
    qualitativeThemeCatalog: {
      positive: [
        { id: 'traceable-sources', label: 'Fuentes trazables' },
        { id: 'useful-drafts', label: 'Borradores utiles' },
      ],
      improvement: [{ id: 'clearer-fallbacks', label: 'Fallbacks mas claros' }],
    },
  };
}

function createParticipant(participantId, profile, susScore) {
  return {
    participantId,
    profile,
    tasks: createTaskResults(participantId),
    susResponses: responsesForScore(susScore),
    positiveThemeIds: ['traceable-sources', 'useful-drafts'],
    improvementThemeIds: ['clearer-fallbacks'],
  };
}

function createTaskResults(participantId) {
  const participantIndex = Number(participantId.slice(1)) - 1;
  const firstTaskSeconds = [90, 105, 110, 120, 130, 140, 145, 150, 160, 170];
  const firstTaskOutcome =
    participantId === 'P09' ? 'partial' : participantId === 'P10' ? 'failed' : 'completed';
  const firstTaskAssistance =
    participantId === 'P08'
      ? 'minor'
      : participantId === 'P09'
        ? 'minor'
        : participantId === 'P10'
          ? 'blocking'
          : 'none';

  return [
    {
      taskId: 'chat-coordination',
      outcome: firstTaskOutcome,
      seconds: firstTaskSeconds[participantIndex],
      assistance: firstTaskAssistance,
      mode: 'openai',
    },
    {
      taskId: 'notice-draft',
      outcome: 'completed',
      seconds: 120,
      assistance: 'none',
      mode: 'openai',
    },
    {
      taskId: 'rag-source',
      outcome: 'completed',
      seconds: 140,
      assistance: 'none',
      mode: 'openai',
    },
    {
      taskId: 'incident-notice',
      outcome: 'completed',
      seconds: 160,
      assistance: 'minor',
      mode: 'deterministic-demo',
      fallbackReason: 'provider-error',
    },
    {
      taskId: 'minutes-pdf',
      outcome: 'completed',
      seconds: 180,
      assistance: 'none',
      mode: 'openai',
    },
    {
      taskId: 'agenda-traceability',
      outcome: 'completed',
      seconds: 200,
      assistance: 'none',
      mode: 'openai',
    },
  ];
}

function responsesForScore(score) {
  const byScore = {
    50: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    60: [4, 2, 4, 3, 4, 3, 3, 3, 3, 3],
    65: [4, 2, 4, 2, 4, 3, 3, 3, 3, 2],
    70: [4, 2, 4, 2, 4, 2, 4, 3, 3, 2],
    75: [4, 2, 4, 2, 4, 2, 4, 2, 4, 2],
    80: [5, 1, 4, 2, 4, 2, 4, 2, 4, 2],
    85: [5, 1, 4, 2, 5, 2, 4, 2, 5, 2],
    95: [5, 1, 5, 1, 5, 1, 5, 1, 4, 2],
  };

  return byScore[score];
}
