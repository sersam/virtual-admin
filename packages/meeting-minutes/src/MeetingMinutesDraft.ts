export interface MeetingMinutesTask {
  readonly assignee?: string;
  readonly description: string;
  readonly dueDate?: string;
}

export interface MeetingMinutesDraftContent {
  readonly title: string;
  readonly body: string;
  readonly tasks: readonly MeetingMinutesTask[];
}

interface ParsedLine {
  readonly content: string;
  readonly type: 'agreement' | 'note' | 'task';
}

const TITLE = 'Acta de reunión';
const AGREEMENT_PREFIX = 'acuerdo:';
const TASK_PREFIXES = ['tarea:', 'pendiente:'] as const;
const ASSIGNEE_LABEL = 'responsable';
const DUE_DATE_LABEL = 'fecha';

export function createMeetingMinutesDraft(notes: string): MeetingMinutesDraftContent {
  const parsedLines = parseLines(notes);
  const noteLines = parsedLines.filter(({ type }) => type === 'note').map(({ content }) => content);
  const agreements = parsedLines
    .filter(({ type }) => type === 'agreement')
    .map(({ content }) => content);
  const tasks = parsedLines
    .filter(({ type }) => type === 'task')
    .map(({ content }) => parseTask(content));

  return {
    title: TITLE,
    body: buildBody({ agreements, noteLines, tasks }),
    tasks,
  };
}

function parseLines(notes: string): ParsedLine[] {
  return notes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseLine);
}

function parseLine(line: string): ParsedLine {
  const lowerCaseLine = line.toLocaleLowerCase('es');

  if (lowerCaseLine.startsWith(AGREEMENT_PREFIX)) {
    return { content: line.slice(AGREEMENT_PREFIX.length).trim(), type: 'agreement' };
  }

  const taskPrefix = TASK_PREFIXES.find((prefix) => lowerCaseLine.startsWith(prefix));
  if (taskPrefix) {
    return { content: line.slice(taskPrefix.length).trim(), type: 'task' };
  }

  return { content: line, type: 'note' };
}

function parseTask(content: string): MeetingMinutesTask {
  const segments = content
    .split(';')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const [description = '', ...metadataSegments] = segments;
  let assignee: string | undefined;
  let dueDate: string | undefined;

  for (const segment of metadataSegments) {
    const separatorIndex = segment.indexOf(':');
    if (separatorIndex < 0) continue;

    const label = segment.slice(0, separatorIndex).trim().toLocaleLowerCase('es');
    const value = trimTrailingPeriod(segment.slice(separatorIndex + 1).trim());
    if (value.length === 0) continue;

    if (label === ASSIGNEE_LABEL) {
      assignee = value;
    }
    if (label === DUE_DATE_LABEL) {
      dueDate = value;
    }
  }

  return {
    ...(assignee ? { assignee } : {}),
    description: trimTrailingPeriod(description),
    ...(dueDate ? { dueDate } : {}),
  };
}

function buildBody(input: {
  readonly agreements: readonly string[];
  readonly noteLines: readonly string[];
  readonly tasks: readonly MeetingMinutesTask[];
}): string {
  return [
    TITLE,
    '',
    'Notas aportadas:',
    ...formatList(input.noteLines),
    '',
    'Acuerdos:',
    ...formatList(input.agreements),
    '',
    'Tareas:',
    ...formatTasks(input.tasks),
  ].join('\n');
}

function formatList(items: readonly string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ['- No se han indicado.'];
}

function formatTasks(tasks: readonly MeetingMinutesTask[]): string[] {
  if (tasks.length === 0) return ['- No se han indicado tareas pendientes.'];

  return tasks.map((task) => {
    const details = [`- ${formatSentence(task.description)}`];
    if (task.assignee) details.push(`Responsable: ${formatSentence(task.assignee)}`);
    if (task.dueDate) details.push(`Fecha: ${formatSentence(task.dueDate)}`);

    return details.join(' ');
  });
}

function formatSentence(text: string): string {
  return text.endsWith('.') ? text : `${text}.`;
}

function trimTrailingPeriod(text: string): string {
  return text.endsWith('.') ? text.slice(0, -1).trim() : text;
}
