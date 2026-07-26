import type { CommunityProposal, Meeting, MeetingAgendaItem } from '@admin/contracts';
import {
  CalendarCheck,
  ClipboardList,
  FilePenLine,
  Lightbulb,
  PlusCircle,
  SendHorizontal,
} from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { useProposals } from '../../proposals/hooks/useProposals';
import { useMeetingAgendaDraft } from '../hooks/useMeetingAgendaDraft';
import { useMeetings } from '../hooks/useMeetings';

const sourceLabels: Record<MeetingAgendaItem['sourceType'], string> = {
  incident: 'Incidencia',
  'pending-agreement': 'Acuerdo pendiente',
  proposal: 'Propuesta vecinal',
};

const priorityLabels = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

const MIN_PROPOSAL_LENGTH = 10;
const MAX_PROPOSAL_LENGTH = 1_000;

export function MeetingAgendaPanel() {
  const [editableDraftBody, setEditableDraftBody] = useState('');
  const [draftInvalidated, setDraftInvalidated] = useState(false);
  const [proposalAnnouncement, setProposalAnnouncement] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const { error, generate, reset, result, status } = useMeetingAgendaDraft();
  const { error: meetingsError, meetings, status: meetingsStatus } = useMeetings();
  const {
    create: createProposal,
    error: proposalsError,
    proposals,
    status: proposalsStatus,
    successMessage,
  } = useProposals();
  const loading = status === 'loading';
  const creatingProposal = proposalsStatus === 'creating';
  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedMeetingId);
  const canGenerate = meetingsStatus === 'ready' && Boolean(selectedMeetingId) && !loading;
  const visibleDraft = result && !draftInvalidated ? result : undefined;

  useEffect(() => {
    if (result) {
      setEditableDraftBody(result.draft.body);
      setDraftInvalidated(false);
    }
  }, [result]);

  useEffect(() => {
    if (selectedMeetingId && meetings.some((meeting) => meeting.id === selectedMeetingId)) return;

    setSelectedMeetingId(meetings[0]?.id ?? '');
  }, [meetings, selectedMeetingId]);

  function handleMeetingChange(event: ChangeEvent<HTMLSelectElement>): void {
    setSelectedMeetingId(event.target.value);
    setEditableDraftBody('');
    setDraftInvalidated(false);
    reset();
  }

  function handleGenerate(): void {
    if (!selectedMeetingId) return;

    void generate(selectedMeetingId);
  }

  async function handleProposalSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const created = await createProposal(proposalDescription);
    if (!created) return;

    setProposalDescription('');
    setProposalAnnouncement('Propuesta registrada.');
    setDraftInvalidated(true);
    setEditableDraftBody('');
    reset();
  }

  return (
    <div className="space-y-6">
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
            <MeetingSelector
              error={meetingsError}
              meetings={meetings}
              onChange={handleMeetingChange}
              selectedMeeting={selectedMeeting}
              selectedMeetingId={selectedMeetingId}
              status={meetingsStatus}
            />
            <button
              className="primary-button"
              disabled={!canGenerate}
              onClick={handleGenerate}
              type="button"
            >
              <SendHorizontal aria-hidden="true" size={17} />
              {loading ? 'Preparando...' : 'Preparar orden del día'}
            </button>
            {error && (
              <p className="text-sm font-semibold text-red-700" role="alert">
                {error}
              </p>
            )}
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

          {!visibleDraft && (
            <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Genera un borrador cuando quieras consolidar los asuntos pendientes para la próxima
              junta.
            </p>
          )}

          {visibleDraft && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-navy-950 p-5 text-white">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-100">
                  <FilePenLine aria-hidden="true" size={14} />
                  Demo determinista
                </span>
                <h3 className="mt-4 font-display text-2xl font-extrabold">
                  {visibleDraft.draft.title}
                </h3>
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
                {visibleDraft.draft.items.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                    Sin entradas pendientes
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {visibleDraft.draft.items.map((item) => (
                      <AgendaInputItem item={item} key={`${item.sourceType}-${item.sourceId}`} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <ProposalsSection
        announcement={proposalAnnouncement || successMessage}
        creating={creatingProposal}
        description={proposalDescription}
        error={proposalsError}
        onDescriptionChange={setProposalDescription}
        onSubmit={handleProposalSubmit}
        proposals={proposals}
        status={proposalsStatus}
      />
    </div>
  );
}

function MeetingSelector({
  error,
  meetings,
  onChange,
  selectedMeeting,
  selectedMeetingId,
  status,
}: {
  readonly error?: string;
  readonly meetings: readonly Meeting[];
  readonly onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  readonly selectedMeeting?: Meeting;
  readonly selectedMeetingId: string;
  readonly status: 'loading' | 'ready' | 'error';
}) {
  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-extrabold text-navy-950" htmlFor="meeting-selector">
          Junta demo
        </label>
        <select
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-navy-950 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400"
          disabled={status !== 'ready' || meetings.length === 0}
          id="meeting-selector"
          onChange={onChange}
          value={selectedMeetingId}
        >
          {meetings.map((meeting) => (
            <option key={meeting.id} value={meeting.id}>
              {formatMeetingOption(meeting)}
            </option>
          ))}
        </select>
      </div>
      {status === 'loading' && (
        <p className="text-sm font-semibold text-slate-600">Cargando juntas demo...</p>
      )}
      {status === 'ready' && meetings.length === 0 && (
        <p className="text-sm font-semibold text-slate-600">No hay juntas demo disponibles.</p>
      )}
      {error && (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
      {selectedMeeting && (
        <p className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-900">
          Seleccionada: {formatMeetingOption(selectedMeeting)}
        </p>
      )}
    </>
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
        {item.sourceType !== 'proposal' && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            {priorityLabels[item.priority]}
          </span>
        )}
      </div>
      <p className="mt-3 font-semibold leading-6 text-navy-950">{item.description}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {item.sourceType === 'pending-agreement'
          ? [item.assignee, item.dueDate, item.sourceId].filter(Boolean).join(' · ')
          : item.sourceId}
      </p>
    </li>
  );
}

function ProposalsSection({
  announcement,
  creating,
  description,
  error,
  onDescriptionChange,
  onSubmit,
  proposals,
  status,
}: {
  readonly announcement?: string;
  readonly creating: boolean;
  readonly description: string;
  readonly error?: string;
  readonly onDescriptionChange: (description: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly proposals: readonly CommunityProposal[];
  readonly status: 'idle' | 'loading' | 'ready' | 'creating' | 'error';
}) {
  const trimmedLength = description.trim().length;

  return (
    <section className="card p-6" aria-labelledby="community-proposals-title">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-sky-50 text-sky-700">
          <Lightbulb aria-hidden="true" size={20} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
            Participación
          </p>
          <h2
            id="community-proposals-title"
            className="font-display text-xl font-extrabold text-navy-950"
          >
            Propuestas vecinales
          </h2>
        </div>
      </div>

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <label className="text-sm font-extrabold text-navy-950" htmlFor="proposal-description">
          Descripción de la propuesta
        </label>
        <textarea
          className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-navy-950 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          id="proposal-description"
          maxLength={MAX_PROPOSAL_LENGTH}
          onChange={(event) => onDescriptionChange(event.target.value)}
          value={description}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            {trimmedLength}/{MAX_PROPOSAL_LENGTH} · mínimo {MIN_PROPOSAL_LENGTH}
          </p>
          <button className="primary-button" disabled={creating} type="submit">
            <PlusCircle aria-hidden="true" size={17} />
            {creating ? 'Registrando...' : 'Registrar propuesta'}
          </button>
        </div>
      </form>

      {announcement && (
        <p className="mt-4 text-sm font-semibold text-emerald-700" role="status">
          {announcement}
        </p>
      )}
      {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
      {status === 'loading' && (
        <p className="mt-4 text-sm font-semibold text-slate-600">Cargando propuestas...</p>
      )}

      {proposals.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
          Aún no hay propuestas registradas en esta sesión.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {proposals.map((proposal) => (
            <li className="rounded-xl bg-slate-50 p-4" key={proposal.id}>
              <p className="text-sm font-semibold leading-6 text-navy-950">
                {proposal.description}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                {formatProposalDate(proposal.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatMeetingOption(meeting: Meeting): string {
  return `${meeting.title} · ${formatMeetingDate(meeting.scheduledAt)}`;
}

function formatMeetingDate(scheduledAt: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
    year: 'numeric',
  }).format(new Date(scheduledAt));
}

function formatProposalDate(createdAt: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: 'short',
    timeZone: 'Europe/Madrid',
    year: 'numeric',
  }).format(new Date(createdAt));
}
