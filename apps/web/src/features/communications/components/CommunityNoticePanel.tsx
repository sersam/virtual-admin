import type { FormEvent } from 'react';
import type {
  CommunityNoticeAudience,
  CommunityNoticeDraftRequest,
  CommunityNoticeDraftResponse,
  CommunityNoticeTone,
  CommunityNoticeType,
} from '@admin/contracts';
import { ClipboardCheck, ClipboardCopy, Download, FilePenLine, SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { formatAiProviderMode } from '../../../shared/config/aiProviderMode';
import { useCommunityNoticeDraft } from '../hooks/useCommunityNoticeDraft';
import { downloadCommunityNoticePdf } from '../model/communityNoticePdf';

const suggestedSubjects = ['Corte de agua', 'Limpieza del garaje', 'Revisión del ascensor'];

interface CommunityNoticePanelProps {
  readonly initialInput?: CommunityNoticeDraftRequest;
}

export function CommunityNoticePanel({ initialInput }: CommunityNoticePanelProps = {}) {
  const resolvedInitialInput = resolveInitialInput(initialInput);
  const [subject, setSubject] = useState(resolvedInitialInput.subject);
  const [type, setType] = useState<CommunityNoticeType>(resolvedInitialInput.type);
  const [audience, setAudience] = useState<CommunityNoticeAudience>(resolvedInitialInput.audience);
  const [tone, setTone] = useState<CommunityNoticeTone>(resolvedInitialInput.tone);
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [copyError, setCopyError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const { error, result, status, submit } = useCommunityNoticeDraft();
  const loading = status === 'loading';
  const hasEditableDraft = editableSubject.trim().length > 0 && editableBody.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const generated = await submit({ subject, type, audience, tone });
    if (generated) {
      setEditableSubject(generated.draft.subject);
      setEditableBody(generated.draft.body);
      setCopyError('');
      setCopySuccess('');
    }
  }

  async function handleCopy() {
    if (!hasEditableDraft) return;

    try {
      await navigator.clipboard.writeText(formatClipboardText(editableSubject, editableBody));
      setCopyError('');
      setCopySuccess('Comunicado copiado.');
    } catch {
      setCopySuccess('');
      setCopyError('No se pudo copiar el comunicado.');
    }
  }

  function handleDownloadPdf() {
    if (!hasEditableDraft) return;

    downloadCommunityNoticePdf({ body: editableBody, subject: editableSubject });
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
          <label className="block text-sm font-bold text-navy-950" htmlFor="notice-subject">
            Asunto
          </label>
          <input
            id="notice-subject"
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-navy-950 shadow-inner outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            onChange={(event) => setSubject(event.target.value)}
            value={subject}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-bold text-navy-950" htmlFor="notice-type">
              Tipo
              <select
                id="notice-type"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-navy-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setType(event.target.value as CommunityNoticeType)}
                value={type}
              >
                <option value="informativo">Informativo</option>
                <option value="recordatorio">Recordatorio</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-navy-950" htmlFor="notice-audience">
              Audiencia
              <select
                id="notice-audience"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-navy-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setAudience(event.target.value as CommunityNoticeAudience)}
                value={audience}
              >
                <option value="todos">Todos</option>
                <option value="propietarios">Propietarios</option>
                <option value="residentes">Residentes</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-navy-950" htmlFor="notice-tone">
              Tono
              <select
                id="notice-tone"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-navy-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setTone(event.target.value as CommunityNoticeTone)}
                value={tone}
              >
                <option value="formal">Formal</option>
                <option value="cercano">Cercano</option>
                <option value="directo">Directo</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedSubjects.map((suggestion) => (
              <button
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-sky-100 hover:text-sky-800"
                key={suggestion}
                onClick={() => setSubject(suggestion)}
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

      <CommunityNoticeResult
        copyError={copyError}
        copySuccess={copySuccess}
        editableBody={editableBody}
        editableSubject={editableSubject}
        hasEditableDraft={hasEditableDraft}
        onCopy={handleCopy}
        onDownloadPdf={handleDownloadPdf}
        onEditableBodyChange={setEditableBody}
        onEditableSubjectChange={setEditableSubject}
        result={result}
      />
    </div>
  );
}

interface CommunityNoticeResultProps {
  readonly copyError: string;
  readonly copySuccess: string;
  readonly editableBody: string;
  readonly editableSubject: string;
  readonly hasEditableDraft: boolean;
  readonly onCopy: () => void;
  readonly onDownloadPdf: () => void;
  readonly onEditableBodyChange: (body: string) => void;
  readonly onEditableSubjectChange: (subject: string) => void;
  readonly result?: CommunityNoticeDraftResponse;
}

function CommunityNoticeResult(props: CommunityNoticeResultProps) {
  return (
    <section className="card p-6" aria-live="polite" aria-labelledby="notice-result-title">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <FilePenLine aria-hidden="true" size={20} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Borrador</p>
          <h2
            id="notice-result-title"
            className="font-display text-xl font-extrabold text-navy-950"
          >
            Comunicado generado
          </h2>
        </div>
      </div>

      {!props.result && (
        <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Indica el aviso que quieres preparar para ver el primer borrador.
        </p>
      )}

      {props.result && <EditableCommunityNoticeResult {...props} result={props.result} />}
    </section>
  );
}

function EditableCommunityNoticeResult(
  props: CommunityNoticeResultProps & { readonly result: CommunityNoticeDraftResponse },
) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl bg-navy-950 p-5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-100">
            <ClipboardCheck aria-hidden="true" size={14} />
            {formatAiProviderMode(props.result.mode)}
          </span>
        </div>
        <h3 className="mt-4 font-display text-2xl font-extrabold">{props.result.draft.subject}</h3>
        <label
          className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-sky-100"
          htmlFor="editable-notice-subject"
        >
          Asunto editable
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-white/15 bg-white p-4 text-sm leading-6 text-navy-950 shadow-inner outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          id="editable-notice-subject"
          onChange={(event) => props.onEditableSubjectChange(event.target.value)}
          value={props.editableSubject}
        />
        <label
          className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-sky-100"
          htmlFor="editable-notice-body"
        >
          Cuerpo editable del comunicado
        </label>
        <textarea
          className="mt-2 min-h-64 w-full rounded-2xl border border-white/15 bg-white p-4 text-sm leading-6 text-navy-950 shadow-inner outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          id="editable-notice-body"
          onChange={(event) => props.onEditableBodyChange(event.target.value)}
          value={props.editableBody}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="primary-button"
            disabled={!props.hasEditableDraft}
            onClick={props.onCopy}
            type="button"
          >
            <ClipboardCopy aria-hidden="true" size={17} />
            Copiar comunicado
          </button>
          <button
            className="primary-button"
            disabled={!props.hasEditableDraft}
            onClick={props.onDownloadPdf}
            type="button"
          >
            <Download aria-hidden="true" size={17} />
            Descargar PDF
          </button>
        </div>
        {props.copySuccess && (
          <p className="mt-3 text-sm font-semibold text-emerald-100">{props.copySuccess}</p>
        )}
        {props.copyError && (
          <p className="mt-3 text-sm font-semibold text-red-100" role="alert">
            {props.copyError}
          </p>
        )}
      </div>
    </div>
  );
}

function formatClipboardText(subject: string, body: string): string {
  return [`Asunto: ${subject.trim()}`, '', body.trim()].join('\n');
}

function resolveInitialInput(
  initialInput: CommunityNoticeDraftRequest | undefined,
): CommunityNoticeDraftRequest {
  return (
    initialInput ?? {
      subject: suggestedSubjects[0]!,
      type: 'informativo',
      audience: 'todos',
      tone: 'formal',
    }
  );
}
