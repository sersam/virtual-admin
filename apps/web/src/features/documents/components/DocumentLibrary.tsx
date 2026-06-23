import { ExternalLink, FileText } from 'lucide-react';
import { documentLibrary } from '../model/documentLibrary';

export function DocumentLibrary() {
  return (
    <section className="card p-6" aria-labelledby="document-library-title">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
          <FileText aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
            Biblioteca documental
          </p>
          <h2
            id="document-library-title"
            className="mt-1 font-display text-2xl font-extrabold text-navy-950"
          >
            Documentos disponibles
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            También puedes abrir cualquier PDF directamente, sin hacer una consulta previa.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {documentLibrary.map((document) => (
          <article
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            key={document.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-sky-700">
                {document.type}
              </span>
              <span className="text-xs font-semibold text-slate-400">{document.section}</span>
            </div>
            <h3 className="mt-3 font-bold text-navy-950">{document.title}</h3>
            <a
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-navy-950"
              href={document.documentUrl}
              rel="noreferrer"
              target="_blank"
            >
              Abrir PDF
              <ExternalLink aria-hidden="true" size={15} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
