import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { format } from 'prettier';

const schemaVersion = 'study-responses/v1';
const allowedStatuses = new Set(['not-conducted', 'final']);
const allowedProfiles = new Set(['administrator-experience', 'owner-or-end-user']);
const allowedOutcomes = new Set(['completed', 'partial', 'failed']);
const allowedAssistance = new Set(['none', 'minor', 'blocking']);
const allowedModes = new Set(['openai', 'deterministic-demo']);
const forbiddenParticipantFields = new Set([
  'age',
  'cookie',
  'email',
  'freeText',
  'ip',
  'name',
  'notes',
  'organization',
  'quote',
  'recording',
  'session',
]);
const expectedParticipantIds = Array.from(
  { length: 10 },
  (_, index) => `P${String(index + 1).padStart(2, '0')}`,
);

const defaultResponsesPath = 'docs/study/responses.json';
const defaultResultsPath = 'docs/study/results.md';

export function scoreSus(responses) {
  if (!Array.isArray(responses) || responses.length !== 10) {
    throw new Error('SUS requiere exactamente 10 respuestas SUS.');
  }

  const adjusted = responses.map((response, index) => {
    if (!Number.isInteger(response) || response < 1 || response > 5) {
      throw new Error('Las respuestas SUS deben ser enteros de 1 a 5.');
    }

    return index % 2 === 0 ? response - 1 : 5 - response;
  });

  return round(sum(adjusted) * 2.5, 2);
}

export function summarizeStudy(dataset) {
  validateStudyDataset(dataset);

  const baseSummary = {
    status: dataset.status,
    study: dataset.study,
    tasks: dataset.status === 'not-conducted' ? dataset.tasks : [],
    participants: {
      total: dataset.participants.length,
      byProfile: {
        administratorExperience: dataset.participants.filter(
          ({ profile }) => profile === 'administrator-experience',
        ).length,
        ownerOrEndUser: dataset.participants.filter(
          ({ profile }) => profile === 'owner-or-end-user',
        ).length,
      },
    },
    qualitativeThemes: summarizeThemes(dataset),
    sus: null,
  };

  if (dataset.status === 'not-conducted') return baseSummary;

  const susScores = dataset.participants.map(({ susResponses }) => scoreSus(susResponses));

  return {
    ...baseSummary,
    tasks: dataset.tasks.map((task) => summarizeTask(task, dataset.participants)),
    sus: {
      mean: round(mean(susScores), 2),
      median: round(median(susScores), 2),
      min: Math.min(...susScores),
      max: Math.max(...susScores),
      sampleStandardDeviation: round(sampleStandardDeviation(susScores), 2),
    },
  };
}

export function renderStudyReport(summary) {
  const lines = [
    '# Resultados del estudio de usabilidad',
    '',
    `- Estado: ${summary.status === 'final' ? 'final' : 'estudio no ejecutado'}`,
    `- Commit evaluado: ${summary.study.evaluatedCommit}`,
    `- Demo publica: ${summary.study.publicDemoUrl}`,
    `- Protocolo: ${summary.study.protocolVersion}`,
    `- Navegador: ${summary.study.browser}`,
    '',
  ];

  if (summary.status !== 'final') {
    lines.push(
      'El estudio humano no se ejecuto por falta de disponibilidad de participantes reales. Este informe no contiene resultados SUS, tiempos observados ni conclusiones de usabilidad basadas en usuarios.',
      '',
      'La evidencia disponible para la defensa queda limitada al protocolo versionado, la matriz de trazabilidad, los benchmarks tecnicos reproducibles y la explicacion explicita de esta limitacion.',
      '',
      '## Tareas previstas',
      '',
      '| ID | Tarea |',
      '| --- | --- |',
    );

    for (const task of plannedTaskRows(summary)) {
      lines.push(`| ${task.id} | ${task.label} |`);
    }

    lines.push('');
    return `${lines.join('\n')}\n`;
  }

  lines.push(
    '## Participantes',
    '',
    '| Metrica | Valor |',
    '| --- | ---: |',
    `| Participantes validos | ${summary.participants.total} |`,
    `| Perfil con experiencia administrativa | ${summary.participants.byProfile.administratorExperience} |`,
    `| Perfil propietario o usuario final | ${summary.participants.byProfile.ownerOrEndUser} |`,
    '',
    '## SUS',
    '',
    '| Metrica | Valor |',
    '| --- | ---: |',
    `| SUS medio | ${formatNumber(summary.sus.mean)} |`,
    `| SUS mediano | ${formatNumber(summary.sus.median)} |`,
    `| SUS minimo | ${formatNumber(summary.sus.min)} |`,
    `| SUS maximo | ${formatNumber(summary.sus.max)} |`,
    `| Desviacion estandar muestral | ${formatNumber(summary.sus.sampleStandardDeviation)} |`,
    '',
    '## Tareas',
    '',
    '| Tarea | Completadas | Parciales | Fallidas | Finalizacion estricta | Sin ayuda | Mediana segundos |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  );

  for (const task of summary.tasks) {
    lines.push(
      `| ${task.label} | ${task.completed} | ${task.partial} | ${task.failed} | ${formatPercent(
        task.strictCompletionRate,
      )} | ${formatPercent(task.withoutAssistanceRate)} | ${task.medianSeconds} |`,
    );
  }

  lines.push(
    '',
    '## Temas cualitativos',
    '',
    '| Tipo | Tema | Frecuencia |',
    '| --- | --- | ---: |',
  );

  for (const theme of summary.qualitativeThemes.positive) {
    lines.push(`| Utilidad | ${theme.id} | ${theme.count} |`);
  }

  for (const theme of summary.qualitativeThemes.improvement) {
    lines.push(`| Mejora | ${theme.id} | ${theme.count} |`);
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

export function validateStudyDataset(dataset) {
  if (!dataset || typeof dataset !== 'object' || Array.isArray(dataset)) {
    throw new Error('El dataset del estudio debe ser un objeto JSON.');
  }

  if (dataset.schemaVersion !== schemaVersion) {
    throw new Error(`Version de dataset no soportada: ${dataset.schemaVersion}.`);
  }

  if (!allowedStatuses.has(dataset.status)) {
    throw new Error('El estado del estudio debe ser not-conducted o final.');
  }

  validateStudyMetadata(dataset.study);
  validateTasks(dataset.tasks);

  if (!Array.isArray(dataset.participants)) {
    throw new Error('participants debe ser un array.');
  }

  if (dataset.status === 'not-conducted') {
    if (dataset.participants.length !== 0) {
      throw new Error('El estado not-conducted no debe incluir participantes parciales.');
    }
    return;
  }

  validateParticipants(dataset);
}

export async function runStudyCli(argv = process.argv.slice(2), io = {}) {
  const command = argv[0];
  const responsesPath = resolve(io.responsesPath ?? defaultResponsesPath);
  const resultsPath = resolve(io.resultsPath ?? defaultResultsPath);
  const stdout = io.stdout ?? process.stdout.write.bind(process.stdout);
  const stderr = io.stderr ?? process.stderr.write.bind(process.stderr);

  try {
    if (!['report', 'check'].includes(command)) {
      throw new Error('Uso: node scripts/study-report.mjs <report|check>');
    }

    const dataset = JSON.parse(await readFile(responsesPath, 'utf8'));
    const report = await formatStudyReport(renderStudyReport(summarizeStudy(dataset)));

    if (command === 'report') {
      await writeFile(resultsPath, report, 'utf8');
      stdout(`Informe de estudio actualizado en ${resultsPath}.\n`);
      return 0;
    }

    const currentReport = await readFile(resultsPath, 'utf8');
    if (currentReport !== report) {
      throw new Error('docs/study/results.md no esta sincronizado. Ejecuta npm run study:report.');
    }

    await verifyDocumentCoverage();
    stdout('Estudio US25 verificado.\n');
    return 0;
  } catch (error) {
    stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

async function formatStudyReport(report) {
  return format(report, { parser: 'markdown' });
}

function validateStudyMetadata(study) {
  const required = [
    'community',
    'evaluatedCommit',
    'publicDemoUrl',
    'browser',
    'collectionStartedAt',
    'collectionFinishedAt',
    'protocolVersion',
  ];

  if (!study || typeof study !== 'object') {
    throw new Error('study debe ser un objeto.');
  }

  for (const field of required) {
    if (typeof study[field] !== 'string' || study[field].trim() === '') {
      throw new Error(`study.${field} es obligatorio.`);
    }
  }
}

function validateTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length !== 6) {
    throw new Error('El protocolo debe declarar exactamente seis tareas.');
  }

  const ids = new Set();
  for (const task of tasks) {
    if (!task || typeof task !== 'object') throw new Error('Cada tarea debe ser un objeto.');
    if (typeof task.id !== 'string' || typeof task.label !== 'string') {
      throw new Error('Cada tarea debe tener id y label.');
    }
    if (ids.has(task.id)) throw new Error(`Tarea duplicada: ${task.id}.`);
    ids.add(task.id);
  }
}

function validateParticipants(dataset) {
  if (dataset.participants.length !== 10) {
    throw new Error('El estudio final debe incluir exactamente P01-P10.');
  }

  const taskIds = dataset.tasks.map(({ id }) => id);
  const participantIds = dataset.participants.map(({ participantId }) => participantId);
  if (participantIds.join(',') !== expectedParticipantIds.join(',')) {
    throw new Error('Los participantes anonimos deben estar ordenados como P01-P10.');
  }

  const profileCounts = new Map();
  for (const participant of dataset.participants) {
    validateParticipant(participant, taskIds, dataset);
    profileCounts.set(participant.profile, (profileCounts.get(participant.profile) ?? 0) + 1);
  }

  if (
    profileCounts.get('administrator-experience') !== 5 ||
    profileCounts.get('owner-or-end-user') !== 5
  ) {
    throw new Error('El reparto de perfiles debe ser 5/5.');
  }
}

function validateParticipant(participant, taskIds, dataset) {
  findForbiddenParticipantField(participant);

  const allowedFields = new Set([
    'participantId',
    'profile',
    'tasks',
    'susResponses',
    'positiveThemeIds',
    'improvementThemeIds',
  ]);

  for (const key of Object.keys(participant)) {
    if (!allowedFields.has(key)) throw new Error(`Campo no permitido en participante: ${key}.`);
  }

  if (!allowedProfiles.has(participant.profile)) {
    throw new Error(`Perfil no soportado para ${participant.participantId}.`);
  }

  scoreSus(participant.susResponses);
  validateParticipantTasks(participant, taskIds);
  validateThemeIds(participant.positiveThemeIds, dataset.qualitativeThemeCatalog?.positive);
  validateThemeIds(participant.improvementThemeIds, dataset.qualitativeThemeCatalog?.improvement);
}

function validateParticipantTasks(participant, taskIds) {
  if (!Array.isArray(participant.tasks) || participant.tasks.length !== taskIds.length) {
    throw new Error(`${participant.participantId} debe tener seis tareas.`);
  }

  const actualIds = participant.tasks.map(({ taskId }) => taskId);
  if (actualIds.join(',') !== taskIds.join(',')) {
    throw new Error(
      `${participant.participantId} debe conservar el orden de tareas del protocolo.`,
    );
  }

  for (const task of participant.tasks) {
    validateTaskObservation(task);
  }
}

function validateTaskObservation(task) {
  if (!allowedOutcomes.has(task.outcome)) throw new Error(`Resultado invalido: ${task.outcome}.`);
  if (!allowedAssistance.has(task.assistance))
    throw new Error(`Ayuda invalida: ${task.assistance}.`);
  if (!allowedModes.has(task.mode)) throw new Error(`Modo invalido: ${task.mode}.`);
  if (!Number.isInteger(task.seconds) || task.seconds <= 0 || task.seconds > 300) {
    throw new Error('Cada tarea debe tener segundos enteros entre 1 y 300.');
  }
  if (task.fallbackReason !== undefined && typeof task.fallbackReason !== 'string') {
    throw new Error('fallbackReason debe ser texto saneado cuando exista.');
  }
}

function validateThemeIds(themeIds, catalog = []) {
  if (!Array.isArray(themeIds)) throw new Error('Los temas cualitativos deben ser arrays.');
  const allowed = new Set(catalog.map(({ id }) => id));

  for (const themeId of themeIds) {
    if (!allowed.has(themeId)) throw new Error(`Tema cualitativo no catalogado: ${themeId}.`);
  }
}

function findForbiddenParticipantField(value) {
  if (!value || typeof value !== 'object') return;

  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenParticipantFields.has(key)) {
      throw new Error(`Campo prohibido por privacidad: ${key}.`);
    }
    if (typeof nested === 'string' && /@/.test(nested)) {
      throw new Error('Campo prohibido por privacidad: posible dato identificable.');
    }
    if (nested && typeof nested === 'object') findForbiddenParticipantField(nested);
  }
}

function summarizeTask(task, participants) {
  const results = participants.map((participant) =>
    participant.tasks.find(({ taskId }) => taskId === task.id),
  );

  return {
    id: task.id,
    label: task.label,
    completed: results.filter(({ outcome }) => outcome === 'completed').length,
    partial: results.filter(({ outcome }) => outcome === 'partial').length,
    failed: results.filter(({ outcome }) => outcome === 'failed').length,
    strictCompletionRate: round(
      results.filter(({ outcome }) => outcome === 'completed').length / results.length,
      2,
    ),
    withoutAssistanceRate: round(
      results.filter(({ assistance }) => assistance === 'none').length / results.length,
      2,
    ),
    medianSeconds: median(results.map(({ seconds }) => seconds)),
    modes: countBy(results, 'mode'),
    fallbacks: countBy(
      results.filter(({ fallbackReason }) => fallbackReason),
      'fallbackReason',
    ),
  };
}

function summarizeThemes(dataset) {
  const positive = countThemeIds(dataset.participants, 'positiveThemeIds');
  const improvement = countThemeIds(dataset.participants, 'improvementThemeIds');

  return {
    positive: sortThemes(positive),
    improvement: sortThemes(improvement),
  };
}

function countThemeIds(participants, field) {
  const counts = new Map();
  for (const participant of participants) {
    for (const themeId of participant[field] ?? []) {
      counts.set(themeId, (counts.get(themeId) ?? 0) + 1);
    }
  }
  return counts;
}

function sortThemes(counts) {
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id));
}

function plannedTaskRows(summary) {
  return summary.tasks;
}

async function verifyDocumentCoverage() {
  const requiredFiles = [
    'docs/specs/us-025-estudio-defensa.md',
    'docs/study/protocol.md',
    'docs/study/results.md',
    'docs/defense-traceability.md',
    'docs/final-metrics-limitations.md',
    'README.md',
    'docs/architecture.md',
    'docs/deployment.md',
  ];

  for (const file of requiredFiles) {
    const content = await readFile(file, 'utf8');
    if (!/US-025|US25|estudio|defensa/i.test(content)) {
      throw new Error(`${file} no contiene referencia verificable a US25.`);
    }
  }
}

function countBy(items, field) {
  return Object.fromEntries(
    [
      ...items.reduce(
        (counts, item) => counts.set(item[field], (counts.get(item[field]) ?? 0) + 1),
        new Map(),
      ),
    ]
      .filter(([key]) => key !== undefined)
      .sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function mean(values) {
  return sum(values) / values.length;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function sampleStandardDeviation(values) {
  const average = mean(values);
  const variance = sum(values.map((value) => (value - average) ** 2)) / (values.length - 1);
  return Math.sqrt(variance);
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatPercent(value) {
  return `${formatNumber(round(value * 100, 2))}%`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runStudyCli();
}
