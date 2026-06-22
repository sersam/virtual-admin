import { Building2, CalendarClock, Files, Home, TriangleAlert } from 'lucide-react';
import { community, communityStats } from '../model/community';

const summary = communityStats(community);
const metrics = [
  {
    label: 'Viviendas',
    value: community.homes,
    detail: `${community.buildings} bloques`,
    icon: Home,
  },
  { label: 'Documentos', value: summary.documents, detail: 'Base documental', icon: Files },
  {
    label: 'Incidencias abiertas',
    value: community.openIncidents,
    detail: 'Pendientes de revisión',
    icon: TriangleAlert,
  },
  {
    label: 'Próxima junta',
    value: community.nextMeeting,
    detail: 'Junta ordinaria',
    icon: CalendarClock,
  },
];

export function CommunityMetrics() {
  return (
    <section aria-labelledby="community-summary-title">
      <div className="mb-4 flex items-center gap-2">
        <Building2 aria-hidden="true" className="text-sky-700" size={18} />
        <h2
          id="community-summary-title"
          className="font-display text-lg font-extrabold text-navy-950"
        >
          Resumen de la comunidad
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <article
            key={label}
            className="card group p-5 transition hover:-translate-y-0.5 hover:border-sky-200"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              </span>
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-400">
                Demo
              </span>
            </div>
            <p className="font-display text-2xl font-extrabold text-navy-950">{value}</p>
            <h3 className="mt-1 text-sm font-bold text-slate-700">{label}</h3>
            <p className="mt-1 text-xs text-slate-400">{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
