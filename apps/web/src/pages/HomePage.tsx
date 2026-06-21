import { ArrowRight, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { CommunityMetrics } from '../features/community/components/CommunityMetrics';
import { DocumentPreview } from '../features/community/components/DocumentPreview';
import { ToolGrid } from '../features/community/components/ToolGrid';
import { community } from '../features/community/model/community';

export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="hero-grid relative isolate overflow-hidden rounded-[2rem] bg-navy-950 px-6 py-9 text-white shadow-2xl shadow-navy-950/15 md:px-10 md:py-12">
        <div className="mountain-lines" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-bold text-sky-100">
            <Sparkles aria-hidden="true" className="text-amber-300" size={15} />
            Inteligencia artificial para tu comunidad
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Una administración más clara, <span className="text-sky-300">a cualquier hora.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-sky-100/85 md:text-lg">
            Consulta documentación, prepara comunicaciones y organiza la gestión de {community.name}{' '}
            desde un único espacio.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/chat" className="primary-action">
              Hablar con el coordinador
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <Link to="/documentos" className="secondary-action">
              Explorar documentos
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-sky-100/70">
            <span className="inline-flex items-center gap-2">
              <MapPin aria-hidden="true" size={14} /> {community.location}
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden="true" size={14} /> Datos ficticios y seguros
            </span>
          </div>
        </div>
      </section>

      <CommunityMetrics />

      <div className="grid items-start gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <ToolGrid />
        <DocumentPreview />
      </div>
    </div>
  );
}
