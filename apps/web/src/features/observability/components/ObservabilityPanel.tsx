import { Activity, Gauge, Timer, WalletCards } from 'lucide-react';
import type { ObservabilityResponse } from '@admin/contracts';
import { useObservability } from '../hooks/useObservability';

export function ObservabilityPanel() {
  const { data, status } = useObservability();

  return (
    <section className="card p-6" aria-labelledby="observability-title">
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
          <Activity aria-hidden="true" size={22} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
            Observabilidad pública
          </p>
          <h2
            id="observability-title"
            className="mt-1 font-display text-2xl font-extrabold text-navy-950"
          >
            Límites y métricas técnicas IA
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Métricas agregadas del día UTC sin prompts, respuestas, documentos, IP ni sesiones.
          </p>
        </div>
      </div>

      {status === 'loading' && (
        <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          Cargando métricas reales...
        </p>
      )}

      {status === 'unavailable' && (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          No hay métricas reales disponibles en este momento.
        </p>
      )}

      {data && <ObservabilityContent data={data} />}
    </section>
  );
}

function ObservabilityContent({ data }: { readonly data: ObservabilityResponse }) {
  return (
    <div className="mt-5 space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Ejecuciones" value={formatInteger(data.summary.executions)} />
        <Metric label="Fallbacks" value={formatInteger(data.summary.fallbacks)} />
        <Metric label="Tokens" value={formatInteger(data.summary.totalTokens)} />
        <Metric label="Coste estimado" value={formatCurrency(data.summary.estimatedCostUsd)} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-extrabold text-navy-950">
            <Gauge aria-hidden="true" size={16} />
            Límites diarios
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {data.limits.aiActionsPerSessionPerDay} acciones por sesión ·{' '}
            {data.limits.aiActionsPerIpPerDay} por IP
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-extrabold text-navy-950">
            <Timer aria-hidden="true" size={16} />
            Latencia media
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {formatInteger(data.summary.averageLatencyMs)} ms · {data.period.day} UTC
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-extrabold text-navy-950">
            <WalletCards aria-hidden="true" size={16} />
            Resultados
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {formatInteger(data.summary.successes)} éxitos · {formatInteger(data.summary.failures)}{' '}
            fallos
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown
          emptyLabel="Sin operaciones registradas hoy."
          items={data.byOperation.map((item) => ({
            label: formatOperation(item.operation),
            value: `${formatInteger(item.executions)} ejecuciones`,
          }))}
          title="Por operación"
        />
        <Breakdown
          emptyLabel="Sin modelos registrados hoy."
          items={data.byModel.map((item) => ({
            label: `${item.provider === 'openai' ? 'OpenAI' : 'Demo'} · ${item.model}`,
            value: `${formatInteger(item.totalTokens)} tokens`,
          }))}
          title="Por modelo"
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-navy-950">{value}</dd>
    </div>
  );
}

function Breakdown({
  emptyLabel,
  items,
  title,
}: {
  readonly emptyLabel: string;
  readonly items: ReadonlyArray<{ readonly label: string; readonly value: string }>;
  readonly title: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-extrabold text-navy-950">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li className="flex items-center justify-between gap-3 text-sm" key={item.label}>
              <span className="font-semibold text-slate-700">{item.label}</span>
              <span className="shrink-0 text-xs font-bold text-slate-400">{item.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    currency: 'USD',
    maximumFractionDigits: 4,
    style: 'currency',
  }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value);
}

function formatOperation(operation: string): string {
  const labels: Record<string, string> = {
    'chat-intent-classification': 'Chat',
    'community-notice': 'Comunicados',
    'document-answer': 'Documentos',
    'document-embedding': 'Embeddings',
    'incident-classification': 'Incidencias',
    'meeting-agenda': 'Juntas',
    'meeting-minutes': 'Actas',
  };

  return labels[operation] ?? operation;
}
