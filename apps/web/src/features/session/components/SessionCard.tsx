import { KeyRound, ShieldCheck } from 'lucide-react';
import { useDemoSession } from '../hooks/useDemoSession';

export function SessionCard() {
  const { data, status } = useDemoSession();
  const usedLabel = `${data.session.requestsUsed}/${data.session.requestsLimit}`;
  const sessionSuffix = data.session.id.slice(-8);
  const modeLabel = data.mode === 'api' ? 'API Express' : 'Demo local';

  return (
    <section className="card p-6" aria-labelledby="session-title">
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <ShieldCheck aria-hidden="true" size={22} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Sesión aislada
          </p>
          <h2
            id="session-title"
            className="mt-1 font-display text-2xl font-extrabold text-navy-950"
          >
            Demo sin registro y sin estado compartido
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Cada navegador recibe una cookie firmada propia. Si la API no está levantada, la
            interfaz conserva un modo local determinista para presentar la demo.
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <SessionMetric label="Origen" value={modeLabel} />
        <SessionMetric label="Uso" value={status === 'loading' ? 'Cargando' : usedLabel} />
        <SessionMetric label="ID" value={`…${sessionSuffix}`} />
      </dl>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
        <KeyRound aria-hidden="true" size={14} />
        {status === 'ready' ? 'API conectada' : 'Fallback seguro activo'}
      </div>
    </section>
  );
}

interface SessionMetricProps {
  readonly label: string;
  readonly value: string;
}

function SessionMetric({ label, value }: SessionMetricProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-navy-950">{value}</dd>
    </div>
  );
}
