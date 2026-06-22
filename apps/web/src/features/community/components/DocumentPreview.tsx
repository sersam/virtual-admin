import { ArrowUpRight, FileText } from 'lucide-react';
import { Link } from 'react-router';
import { community } from '../model/community';

export function DocumentPreview() {
  return (
    <section className="card overflow-hidden" aria-labelledby="documents-title">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-sky-700">
            Biblioteca
          </p>
          <h2
            id="documents-title"
            className="mt-1 font-display text-lg font-extrabold text-navy-950"
          >
            Documentación reciente
          </h2>
        </div>
        <Link to="/documentos" className="icon-link" aria-label="Ver toda la documentación">
          <ArrowUpRight aria-hidden="true" size={18} />
        </Link>
      </div>
      <ul className="divide-y divide-slate-100">
        {community.documents.slice(0, 4).map((document) => (
          <li key={document.id} className="flex items-center gap-3 px-5 py-4 md:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <FileText aria-hidden="true" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-navy-950">{document.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">Actualizado · {document.updatedAt}</p>
            </div>
            <span className="hidden rounded-full bg-sky-50 px-2.5 py-1 text-[0.65rem] font-bold text-sky-700 sm:inline">
              {document.category}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
