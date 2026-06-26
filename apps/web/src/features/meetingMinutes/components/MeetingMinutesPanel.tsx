import type { FormEvent } from 'react';
import { ClipboardList, FileText, SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useMeetingMinutesDraft } from '../hooks/useMeetingMinutesDraft';

const suggestedNotes = [
  [
    'Junta ordinaria del 12 de junio.',
    'Acuerdo: aprobar presupuesto.',
    'Tarea: Revisar contrato; Responsable: Ana',
  ].join('\n'),
  [
    'Reunión de seguimiento de mantenimiento.',
    'Acuerdo: solicitar tres presupuestos para pintura.',
    'Pendiente: Avisar a proveedores; Responsable: Carlos; Fecha: próxima semana',
  ].join('\n'),
  [
    'Junta extraordinaria sobre placas solares.',
    'Acuerdo: estudiar subvenciones disponibles.',
    'Tarea: Preparar comparativa; Responsable: Lucía',
  ].join('\n'),
];

export function MeetingMinutesPanel() {
  const [notes, setNotes] = useState(suggestedNotes[0]!);
  const { error, result, status, submit } = useMeetingMinutesDraft();
  const loading = status === 'loading';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(notes);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
      <section className="card p-6" aria-labelledby="minutes-draft-title">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
          Agente de actas
        </p>
        <h1
          id="minutes-draft-title"
          className="mt-2 font-display text-3xl font-extrabold text-navy-950"
        >
          Convierte notas en actas
        </h1>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-bold text-navy-950" htmlFor="meeting-notes">
            Notas de la reunión
          </label>
          <textarea
            id="meeting-notes"
            className="min-h-48 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-navy-950 shadow-inner outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
          <div className="flex flex-wrap gap-2">
            {suggestedNotes.map((suggestion, index) => (
              <button
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-sky-100 hover:text-sky-800"
                key={suggestion}
                onClick={() => setNotes(suggestion)}
                type="button"
              >
                Ejemplo {index + 1}
              </button>
            ))}
          </div>
          <button className="primary-button" disabled={loading} type="submit">
            <SendHorizontal aria-hidden="true" size={17} />
            {loading ? 'Generando…' : 'Generar acta'}
          </button>
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        </form>
      </section>

      <section className="card p-6" aria-live="polite" aria-label="Acta generada">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <FileText aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Borrador
            </p>
            <h2 className="font-display text-xl font-extrabold text-navy-950">Acta generada</h2>
          </div>
        </div>

        {!result && (
          <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Pega las notas de la reunión para generar un acta estructurada.
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-navy-950 p-5 text-white">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-100">
                <ClipboardList aria-hidden="true" size={14} />
                Demo determinista
              </span>
              <h3 className="mt-4 font-display text-2xl font-extrabold">{result.draft.title}</h3>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-sky-50">
                {result.draft.body}
              </p>
            </div>

            {result.draft.tasks.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-extrabold text-navy-950">Tareas detectadas</h3>
                <ul className="mt-3 space-y-2">
                  {result.draft.tasks.map((task) => (
                    <li
                      className="grid gap-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 md:grid-cols-[1fr_auto]"
                      key={`${task.description}-${task.assignee ?? ''}-${task.dueDate ?? ''}`}
                    >
                      <span className="font-semibold text-navy-950">{task.description}</span>
                      {(task.assignee || task.dueDate) && (
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          {[task.assignee, task.dueDate].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
