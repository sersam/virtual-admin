import { X } from 'lucide-react';
import { NavLink } from 'react-router';
import type { NavLinkRenderProps } from 'react-router';
import { navigationItems } from '../../shared/config/navigation';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { Brand } from '../../shared/ui/Brand';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Readonly<SidebarProps>) {
  const desktopNavigation = useMediaQuery('(min-width: 1024px)');
  const interactive = open || desktopNavigation;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-hidden={!interactive}
        inert={!interactive}
        className={`fixed inset-y-0 left-0 z-50 flex w-[18rem] flex-col overflow-y-auto bg-navy-950 px-5 py-6 shadow-2xl transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-8 flex items-center justify-between">
          <Brand />
          <button
            type="button"
            aria-label="Cerrar menú"
            className="rounded-xl p-2 text-sky-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
            onClick={onClose}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 space-y-1.5">
          {navigationItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onClose}
              className={({ isActive }: NavLinkRenderProps) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  isActive
                    ? 'bg-white text-navy-950 shadow-lg shadow-slate-950/20'
                    : 'text-sky-100 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/6 p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-white">
            <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>Entorno de demostración</span>
          </div>
          <p className="text-xs leading-5 text-sky-200">
            Datos ficticios · Sin registro · Acceso público
          </p>
        </div>
      </aside>
    </>
  );
}
