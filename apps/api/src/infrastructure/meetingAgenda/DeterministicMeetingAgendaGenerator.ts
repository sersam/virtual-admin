import type { IncidentPriority, MeetingAgendaItem } from '@admin/contracts';
import type {
  MeetingAgendaDraftBody,
  MeetingAgendaGenerator,
  MeetingAgendaGeneratorInput,
} from '../../application/ports/MeetingAgendaGenerator.js';

const TITLE = 'Orden del día';
const MAX_BODY_LENGTH = 4_000;
const TRUNCATED_BODY_NOTICE =
  'Contenido abreviado por el límite del borrador. Consulta «Entradas utilizadas» para ver todas las fuentes.';

type PrioritizedAgendaItem = Extract<
  MeetingAgendaItem,
  { sourceType: 'incident' | 'pending-agreement' }
>;

export class DeterministicMeetingAgendaGenerator implements MeetingAgendaGenerator {
  async draft(input: MeetingAgendaGeneratorInput): Promise<MeetingAgendaDraftBody> {
    return {
      body: buildBody(input.items),
      mode: 'deterministic-demo',
    };
  }
}

function buildBody(items: readonly MeetingAgendaItem[]): string {
  const visibleBlocks: string[][] = [];
  let truncated = false;

  for (const [index, item] of items.entries()) {
    const block = formatAgendaBlock(item, index);
    const candidateBlocks = [...visibleBlocks, block];
    if (renderBody(candidateBlocks).length <= MAX_BODY_LENGTH) {
      visibleBlocks.push(block);
      continue;
    }

    truncated = true;
    break;
  }

  if (!truncated) return renderBody(visibleBlocks);

  while (
    renderBody(visibleBlocks, TRUNCATED_BODY_NOTICE).length > MAX_BODY_LENGTH &&
    visibleBlocks.length > 0
  ) {
    visibleBlocks.pop();
  }

  return renderBody(visibleBlocks, TRUNCATED_BODY_NOTICE);
}

function renderBody(blocks: readonly string[][], notice?: string): string {
  return [TITLE, '', ...blocks.flat(), ...(notice ? [notice] : [])].join('\n');
}

function formatAgendaBlock(item: MeetingAgendaItem, index: number): string[] {
  if (item.sourceType === 'proposal') {
    return [`${index + 1}. ${item.description}`];
  }

  return [
    `${index + 1}. [${formatPriority(item.priority)}] ${item.description}`,
    `   ${formatSourceDetails(item)}`,
  ];
}

function formatPriority(priority: IncidentPriority): string {
  return priority.charAt(0).toLocaleUpperCase('es') + priority.slice(1);
}

function formatSourceDetails(item: PrioritizedAgendaItem): string {
  const sourceName = item.sourceType === 'incident' ? 'incidencia' : 'acuerdo pendiente';
  const details = [`Origen: ${sourceName} ${item.sourceId}.`];
  if (item.sourceType === 'pending-agreement') {
    if (item.assignee) details.push(`Responsable: ${item.assignee}.`);
    if (item.dueDate) details.push(`Fecha: ${item.dueDate}.`);
    if (item.dueOn) details.push(`Fecha limite estructurada: ${item.dueOn}.`);
  } else if (item.status === 'resuelta' && item.resolvedAt) {
    details.push(`Resuelta el ${formatResolvedDate(item.resolvedAt)}.`);
  }

  return details.join(' ');
}

function formatResolvedDate(resolvedAt: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
    year: 'numeric',
  }).format(new Date(resolvedAt));
}
