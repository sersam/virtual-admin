import type { FormEvent } from 'react';
import { ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useDocumentQuery } from '../hooks/useDocumentQuery';
import { DocumentLibrary } from './DocumentLibrary';
import { UploadedDocumentManager } from './UploadedDocumentManager';

const suggestedQuestions = [
  '¿Cuál es el horario de la piscina?',
  '¿Qué se acordó sobre el ascensor del portal B?',
  '¿A qué hora deben terminar las actividades ruidosas?',
];

export function DocumentQueryPanel() {
  const [question, setQuestion] = useState(suggestedQuestions[0]!);
  const { error, result, status, submit } = useDocumentQuery();
  const loading = status === 'loading';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(question);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="card p-6" aria-labelledby="document-query-title">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
            Consulta documental RAG
          </p>
          <h1
            id="document-query-title"
            className="mt-2 font-display text-3xl font-extrabold text-navy-950"
          >
            Pregunta a los documentos de la comunidad
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            El sistema recupera fragmentos del corpus ficticio de Residencial Sierra Nevada y
            muestra siempre las fuentes utilizadas.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-bold text-navy-950" htmlFor="document-question">
              Pregunta
            </label>
            <textarea
              id="document-question"
              className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-navy-950 shadow-inner outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              onChange={(event) => setQuestion(event.target.value)}
              value={question}
            />
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((suggestion) => (
                <button
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-sky-100 hover:text-sky-800"
                  key={suggestion}
                  onClick={() => setQuestion(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <button className="primary-button" disabled={loading} type="submit">
              <Search aria-hidden="true" size={17} />
              {loading ? 'Consultando…' : 'Consultar documentación'}
            </button>
            {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
          </form>
        </section>

        <section className="card p-6" aria-live="polite" aria-labelledby="document-answer-title">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck aria-hidden="true" size={20} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Respuesta trazable
              </p>
              <h2
                id="document-answer-title"
                className="font-display text-xl font-extrabold text-navy-950"
              >
                Fuentes recuperadas
              </h2>
            </div>
          </div>

          {!result && (
            <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Haz una consulta para ver la respuesta y los fragmentos utilizados como evidencia.
            </p>
          )}

          {result && (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl bg-navy-950 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-200">
                  {result.mode === 'lexical-demo' ? 'API RAG léxica' : 'Modo demo local'}
                </p>
                <p className="mt-3 text-sm leading-6 text-sky-50">{result.answer}</p>
              </div>
              <div className="space-y-3">
                {result.sources.map((source) => (
                  <article className="rounded-2xl border border-slate-200 p-4" key={source.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-navy-950">{source.title}</h3>
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                        {source.section}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{source.excerpt}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      Relevancia {Math.round(source.score * 100)}%
                    </p>
                    <a
                      className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-navy-950"
                      href={source.documentUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Abrir PDF completo
                      <ExternalLink aria-hidden="true" size={15} />
                    </a>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
      <UploadedDocumentManager />
      <DocumentLibrary />
    </div>
  );
}
