import { Building2 } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-white ring-1 ring-white/15">
        <Building2 aria-hidden="true" size={22} strokeWidth={1.8} />
      </span>
      {!compact && (
        <div>
          <p className="font-display text-base font-extrabold tracking-[0.14em] text-white">
            SIERRA
          </p>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-sky-200">
            Administrador virtual
          </p>
        </div>
      )}
    </div>
  );
}
