import { ArrowLeft, CheckCircle2, Clock3 } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { navigationItems } from '../shared/config/navigation';

export function ComingSoonPage() {
  const { pathname } = useLocation();
  const item = navigationItems.find(({ path }) => path === pathname);
  const Icon = item?.icon ?? Clock3;

  return (
    <section className="mx-auto max-w-3xl py-8 md:py-16">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-navy-950"
      >
        <ArrowLeft aria-hidden="true" size={17} /> Volver al inicio
      </Link>
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 p-8 md:p-10">
          <span className="grid size-14 place-items-center rounded-2xl bg-navy-950 text-white">
            <Icon aria-hidden="true" size={25} strokeWidth={1.7} />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.17em] text-sky-700">
            Próxima funcionalidad
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-navy-950 md:text-4xl">
            {item?.label ?? 'Herramienta'}
          </h1>
          <p className="mt-3 max-w-xl leading-7 text-slate-500">
            {item?.description ?? 'Esta herramienta estará disponible próximamente'}. Esta pantalla
            ya forma parte del shell navegable y se activará en su historia de usuario
            correspondiente.
          </p>
        </div>
        <div className="p-8 md:p-10">
          <div className="flex gap-3">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-emerald-600"
              size={19}
            />
            <div>
              <h2 className="font-bold text-navy-950">Ruta preparada</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                La navegación, el layout responsive y la estructura de feature están listos para
                recibir esta capacidad sin alterar el resto de la aplicación.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
