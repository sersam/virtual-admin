import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router';
import { community } from '../../features/community/model/community';
import { StatusPill } from '../../shared/ui/StatusPill';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-[18rem]">
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-200/80 bg-white/88 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              className="rounded-xl border border-slate-200 p-2.5 text-navy-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <Menu aria-hidden="true" size={20} />
            </button>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Comunidad
              </p>
              <p className="text-sm font-bold text-navy-900">{community.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill />
            <span
              aria-label="Perfil de la comunidad"
              className="hidden size-10 place-items-center rounded-full bg-navy-100 text-sm font-extrabold text-navy-900 sm:grid"
            >
              RS
            </span>
          </div>
        </header>
        <main id="contenido" className="mx-auto max-w-[90rem] p-5 md:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
