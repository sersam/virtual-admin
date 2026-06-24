import type { ChangeEvent } from 'react';
import { ExternalLink, FileUp } from 'lucide-react';
import { useUploadedDocuments } from '../hooks/useUploadedDocuments';

export function UploadedDocumentManager() {
  const { documents, error, status, upload } = useUploadedDocuments();
  const uploading = status === 'uploading';

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    await upload(files);
    event.target.value = '';
  }

  return (
    <section className="card p-6" aria-labelledby="uploaded-documents-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <FileUp aria-hidden="true" size={21} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Adjuntos de sesión
            </p>
            <h2
              id="uploaded-documents-title"
              className="mt-1 font-display text-2xl font-extrabold text-navy-950"
            >
              PDFs subidos en esta sesión
            </h2>
          </div>
        </div>

        <label className="primary-button cursor-pointer" htmlFor="session-pdf-upload">
          <FileUp aria-hidden="true" size={17} />
          {uploading ? 'Subiendo...' : 'Subir PDFs'}
        </label>
        <input
          accept="application/pdf"
          className="sr-only"
          disabled={uploading}
          id="session-pdf-upload"
          multiple
          onChange={handleUpload}
          type="file"
        />
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}

      {documents.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          No hay PDFs subidos en esta sesión.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <article
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              key={document.id}
            >
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-700">
                PDF adjunto
              </span>
              <h3 className="mt-3 font-bold text-navy-950">{document.title}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {formatFileSize(document.sizeBytes)}
              </p>
              <a
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-navy-950"
                href={document.documentUrl}
                rel="noreferrer"
                target="_blank"
              >
                Abrir PDF subido
                <ExternalLink aria-hidden="true" size={15} />
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
