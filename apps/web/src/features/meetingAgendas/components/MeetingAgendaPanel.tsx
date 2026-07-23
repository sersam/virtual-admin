import type { MeetingAgendaItem } from '@admin/contracts';
import { CalendarCheck, ClipboardList, FilePenLine, SendHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMeetingAgendaDraft } from '../hooks/useMeetingAgendaDraft';

const sourceLabels: Record<MeetingAgendaItem['sourceType'], string> = {
  incident: 'Incidencia',
  'pending-agreement': 'Acuerdo pendiente',
};

const priorityLabels: Record<MeetingAgendaItem['priority'], string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

export function MeetingAgendaPanel() {
  const [editableDraftBody, setEditableDraftBody] = useState('');
  const { error, generate, result, status } = useMeetingAgendaDraft();
  const loading = status === 'loading';

  useEffect(() => {
    if (result) {
      setEditableDraftBody(result.draft.body);
    }
  }, [result]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="card p-6" aria-labelledby="meeting-agenda-title">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
          Agente de juntas
        </p>
        <h1
          id="meeting-agenda-title"
          className="mt-2 font-display text-3xl font-extrabold text-navy-950"
        >
          Prepara el orden del día
        </h1>

        <div className="mt-6 space-y-4">
          <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Se usará la información pendiente de la sesión demo: incidencias registradas y tareas
            detectadas en actas.
          </p>
          <button className="primary-button" disabled={loading} onClick={generate} type="button">
            <SendHorizontal aria-hidden="true" size={17} />
            {loading ? 'Preparando...' : 'Preparar orden del día'}
          </button>
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        </div>
      </section>

      <section className="card p-6" aria-live="polite" aria-label="Orden del día generado">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CalendarCheck aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Borrador
            </p>
            <h2 className="font-display text-xl font-extrabold text-navy-950">Orden del día</h2>
          </div>
        </div>

        {!result && (
          <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Genera un borrador cuando quieras consolidar los asuntos pendientes para la próxima
            junta.
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-navy-950 p-5 text-white">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-100">
                <FilePenLine aria-hidden="true" size={14} />
                Demo determinista
              </span>
              <h3 className="mt-4 font-display text-2xl font-extrabold">{result.draft.title}</h3>
              <label
                className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-sky-100"
                htmlFor="editable-meeting-agenda"
              >
                Borrador editable del orden del día
              </label>
              <textarea
                className="mt-2 min-h-72 w-full rounded-2xl border border-white/15 bg-white p-4 text-sm leading-6 text-navy-950 shadow-inner outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                id="editable-meeting-agenda"
                onChange={(event) => setEditableDraftBody(event.target.value)}
                value={editableDraftBody}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-extrabold text-navy-950">Entradas utilizadas</h3>
              {result.draft.items.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                  Sin entradas pendientes
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {result.draft.items.map((item) => (
                    <AgendaInputItem item={item} key={`${item.sourceType}-${item.sourceId}`} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function AgendaInputItem({ item }: { readonly item: MeetingAgendaItem }) {
  return (
    <li className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
          <ClipboardList aria-hidden="true" size={14} />
          {sourceLabels[item.sourceType]}
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
          {priorityLabels[item.priority]}
        </span>
      </div>
      <p className="mt-3 font-semibold leading-6 text-navy-950">{item.description}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {[item.assignee, item.dueDate, item.sourceId].filter(Boolean).join(' · ')}
      </p>
    </li>
  );
}
