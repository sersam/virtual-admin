import type { FormEvent } from 'react';
import type { Incident, IncidentPriority, IncidentType } from '@admin/contracts';
import { CheckCircle2, ClipboardList, Filter, SendHorizontal, Wrench } from 'lucide-react';
import { useState } from 'react';
import { formatAiProviderMode } from '../../../shared/config/aiProviderMode';
import { useIncidents } from '../hooks/useIncidents';

const suggestedDescriptions = [
  'Hay una fuga de agua urgente en el garaje.',
  'El ascensor no funciona desde esta mañana.',
  'Hay bolsas de basura acumuladas en el portal.',
];

const incidentTypeLabels: Record<IncidentType, string> = {
  agua: 'Agua',
  electricidad: 'Electricidad',
  ascensor: 'Ascensor',
  limpieza: 'Limpieza',
  seguridad: 'Seguridad',
  convivencia: 'Convivencia',
  otro: 'Otro',
};

const priorityLabels: Record<IncidentPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

const incidentTypes = Object.keys(incidentTypeLabels) as IncidentType[];

export function IncidentsPanel() {
  const [description, setDescription] = useState(suggestedDescriptions[0]!);
  const {
    create,
    error,
    filterByType,
    incidents,
    providerMode,
    resolve,
    resolvingIncidentId,
    selectedType,
    status,
  } = useIncidents();
  const loading = status === 'loading';
  const creating = status === 'creating';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await create(description);
  }

  async function handleFilterChange(type: string) {
    await filterByType(type ? (type as IncidentType) : undefined);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="card p-6" aria-labelledby="incidents-title">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
          Agente de incidencias
        </p>
        <h1
          id="incidents-title"
          className="mt-2 font-display text-3xl font-extrabold text-navy-950"
        >
          Registra y clasifica incidencias
        </h1>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-bold text-navy-950" htmlFor="incident-description">
            Descripción de la incidencia
          </label>
          <textarea
            id="incident-description"
            className="min-h-40 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-navy-950 shadow-inner outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
          <div className="flex flex-wrap gap-2">
            {suggestedDescriptions.map((suggestion) => (
              <button
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-sky-100 hover:text-sky-800"
                key={suggestion}
                onClick={() => setDescription(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <button className="primary-button" disabled={creating} type="submit">
            <SendHorizontal aria-hidden="true" size={17} />
            {creating ? 'Registrando...' : 'Registrar incidencia'}
          </button>
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        </form>
      </section>

      <section className="card p-6" aria-live="polite" aria-labelledby="incidents-list-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ClipboardList aria-hidden="true" size={20} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Seguimiento
              </p>
              <h2
                id="incidents-list-title"
                className="font-display text-xl font-extrabold text-navy-950"
              >
                Incidencias registradas
              </h2>
            </div>
            {providerMode ? (
              <span className="mt-2 inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
                {formatAiProviderMode(providerMode)}
              </span>
            ) : null}
          </div>

          <label
            className="grid gap-2 text-sm font-bold text-navy-950"
            htmlFor="incident-type-filter"
          >
            <span>Filtrar por tipo</span>
            <span className="relative">
              <Filter
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <select
                className="h-11 rounded-2xl border border-slate-200 bg-white pl-9 pr-4 text-sm font-semibold text-navy-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                id="incident-type-filter"
                onChange={(event) => void handleFilterChange(event.target.value)}
                value={selectedType ?? ''}
              >
                <option value="">Todos los tipos</option>
                {incidentTypes.map((type) => (
                  <option key={type} value={type}>
                    {incidentTypeLabels[type]}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>

        {loading && (
          <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Cargando incidencias...
          </p>
        )}

        {!loading && incidents.length === 0 && (
          <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Sin incidencias registradas
          </p>
        )}

        {incidents.length > 0 && (
          <div className="mt-6 grid gap-3">
            {incidents.map((incident) => (
              <IncidentItem
                incident={incident}
                isResolving={resolvingIncidentId === incident.id}
                key={incident.id}
                onResolve={resolve}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface IncidentItemProps {
  readonly incident: Incident;
  readonly isResolving: boolean;
  readonly onResolve: (incidentId: string) => Promise<void>;
}

function IncidentItem({ incident, isResolving, onResolve }: IncidentItemProps) {
  const resolved = incident.status === 'resuelta';

  return (
    <article
      aria-label={incident.description}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
          <Wrench aria-hidden="true" size={14} />
          {incidentTypeLabels[incident.type]}
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
          {priorityLabels[incident.priority]}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${resolved ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}
        >
          {resolved ? 'Resuelta' : 'Pendiente'}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-navy-950">{incident.description}</p>
      <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Responsable sugerido
          </dt>
          <dd className="mt-1 font-semibold text-navy-950">{incident.suggestedResponsible}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Registro</dt>
          <dd className="mt-1 font-semibold text-navy-950">{formatDate(incident.createdAt)}</dd>
        </div>
        {resolved ? (
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Resolución
            </dt>
            <dd className="mt-1 font-semibold text-navy-950">
              <time dateTime={incident.resolvedAt}>{formatDate(incident.resolvedAt)}</time>
            </dd>
          </div>
        ) : null}
      </dl>
      {!resolved ? (
        <button
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
          disabled={isResolving}
          onClick={() => void onResolve(incident.id)}
          type="button"
        >
          <CheckCircle2 aria-hidden="true" size={17} />
          {isResolving ? 'Resolviendo...' : 'Marcar como resuelta'}
        </button>
      ) : null}
    </article>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
