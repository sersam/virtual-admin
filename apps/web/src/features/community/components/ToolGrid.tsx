import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { navigationItems } from '../../../shared/config/navigation';

export function ToolGrid() {
  const tools = navigationItems.filter(({ path }) => path !== '/').slice(0, 4);
  return (
    <section aria-labelledby="tools-title">
      <div className="mb-4">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-sky-700">
          Agentes especializados
        </p>
        <h2 id="tools-title" className="mt-1 font-display text-xl font-extrabold text-navy-950">
          ¿Qué necesitas resolver?
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map(({ path, label, description, icon: Icon }, index) => (
          <Link
            key={path}
            to={path}
            className="card group flex items-start gap-4 p-5 hover:border-sky-200"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-950 text-white">
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-[0.65rem] font-bold text-slate-400">0{index + 1}</span>
              <span className="mt-0.5 block font-display text-base font-extrabold text-navy-950">
                {label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="mt-3 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-700"
              size={17}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
