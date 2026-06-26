import type { FormEvent } from 'react';
import { ClipboardCheck, FilePenLine, SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useCommunityNoticeDraft } from '../hooks/useCommunityNoticeDraft';

const suggestedMessages = [
  'Redacta un comunicado sobre el corte de agua.',
  'Redacta un comunicado sobre la limpieza del garaje.',
  'Redacta un comunicado sobre la revisión del ascensor.',
];

export function CommunityNoticePanel() {
  const [message, setMessage] = useState(suggestedMessages[0]!);
  const { error, result, status, submit } = useCommunityNoticeDraft();
  const loading = status === 'loading';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(message);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
      <section className="card p-6" aria-labelledby="notice-draft-title">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
          Agente de comunicados
        </p>
        <h1
          id="notice-draft-title"
          className="mt-2 font-display text-3xl font-extrabold text-navy-950"
        >
          Redacta comunicados para vecinos
        </h1>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-bold text-navy-950" htmlFor="notice-message">
            Necesidad del comunicado
          </label>
          <textarea
            id="notice-message"
            className="min-h-36 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-navy-950 shadow-inner outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            onChange={(event) => setMessage(event.target.value)}
            value={message}
          />
          <div className="flex flex-wrap gap-2">
            {suggestedMessages.map((suggestion) => (
              <button
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-sky-100 hover:text-sky-800"
                key={suggestion}
                onClick={() => setMessage(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <button className="primary-button" disabled={loading} type="submit">
            <SendHorizontal aria-hidden="true" size={17} />
            {loading ? 'Redactando…' : 'Redactar comunicado'}
          </button>
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        </form>
      </section>

      <section className="card p-6" aria-live="polite" aria-labelledby="notice-result-title">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <FilePenLine aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Borrador
            </p>
            <h2
              id="notice-result-title"
              className="font-display text-xl font-extrabold text-navy-950"
            >
              Comunicado generado
            </h2>
          </div>
        </div>

        {!result && (
          <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Indica el aviso que quieres preparar para ver el primer borrador.
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-navy-950 p-5 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-100">
                  <ClipboardCheck aria-hidden="true" size={14} />
                  Demo determinista
                </span>
              </div>
              <h3 className="mt-4 font-display text-2xl font-extrabold">{result.draft.subject}</h3>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-sky-50">
                {result.draft.body}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
