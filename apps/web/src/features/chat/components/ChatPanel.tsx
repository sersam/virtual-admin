import type { ChatAgent, ChatMode } from '@admin/contracts';
import type { FormEvent } from 'react';
import { Bot, ExternalLink, SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useChatMessage } from '../hooks/useChatMessage';

const agentLabels: Record<ChatAgent, string> = {
  actas: 'Agente de actas',
  comunicados: 'Agente de comunicados',
  documentos: 'Agente de documentos',
  general: 'Coordinador general',
  incidencias: 'Agente de incidencias',
  juntas: 'Agente de juntas',
};

const modeLabels: Record<ChatMode, string> = {
  'langgraph-demo': 'LangGraph demo',
  'local-demo': 'Modo demo local',
};

const mvpAreaExamples = [
  {
    label: 'Documentos',
    message: '¿Qué dicen las normas de la piscina?',
  },
  {
    label: 'Comunicados',
    message: 'Redacta un comunicado para avisar del corte de agua del jueves.',
  },
  {
    label: 'Actas',
    message: 'Convierte estas notas en un acta formal de la junta ordinaria.',
  },
  {
    label: 'Incidencias',
    message: 'Hay una fuga en el garaje, clasifica la incidencia y su prioridad.',
  },
  {
    label: 'Juntas',
    message: 'Prepara el orden del día para la próxima junta de propietarios.',
  },
];

export function ChatPanel() {
  const [message, setMessage] = useState('¿Qué dicen las normas de la piscina?');
  const { error, result, status, submit } = useChatMessage();
  const loading = status === 'loading';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(message);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="card p-6" aria-labelledby="chat-title">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
          Coordinador multiagente
        </p>
        <h1 id="chat-title" className="mt-2 font-display text-3xl font-extrabold text-navy-950">
          Chat coordinador multiagente
        </h1>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-bold text-navy-950" htmlFor="chat-message">
            Mensaje
          </label>
          <textarea
            className="min-h-36 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-navy-950 shadow-inner outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            id="chat-message"
            onChange={(event) => setMessage(event.target.value)}
            value={message}
          />
          <div className="flex flex-wrap gap-2">
            {mvpAreaExamples.map((example) => (
              <button
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-sky-100 hover:text-sky-800"
                key={example.label}
                onClick={() => setMessage(example.message)}
                type="button"
              >
                {example.label}
              </button>
            ))}
          </div>
          <button className="primary-button" disabled={loading} type="submit">
            <SendHorizontal aria-hidden="true" size={17} />
            {loading ? 'Enviando...' : 'Enviar mensaje'}
          </button>
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        </form>
      </section>

      <section className="card p-6" aria-live="polite" aria-labelledby="chat-answer-title">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-sky-50 text-sky-700">
            <Bot aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Respuesta</p>
            <h2
              id="chat-answer-title"
              className="font-display text-xl font-extrabold text-navy-950"
            >
              Respuesta del coordinador
            </h2>
          </div>
        </div>

        {!result && (
          <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Envía un mensaje para ver el agente seleccionado.
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl bg-navy-950 p-5 text-white">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-100">
                  {agentLabels[result.agent]}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-100">
                  {modeLabels[result.mode]}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-sky-50">
                {result.answer}
              </p>
            </div>

            {result.sources.length > 0 && (
              <div className="space-y-3">
                {result.sources.map((source) => (
                  <article className="rounded-2xl border border-slate-200 p-4" key={source.id}>
                    <h3 className="font-bold text-navy-950">{source.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{source.excerpt}</p>
                    <a
                      className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-navy-950"
                      href={source.documentUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Abrir PDF
                      <ExternalLink aria-hidden="true" size={15} />
                    </a>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
