import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  FilePenLine,
  Files,
  LayoutDashboard,
  MessageSquareText,
  ScrollText,
  Wrench,
} from 'lucide-react';

export interface NavigationItem {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
}

export const navigationItems: NavigationItem[] = [
  {
    path: '/',
    label: 'Inicio',
    description: 'Resumen de la comunidad',
    icon: LayoutDashboard,
    available: true,
  },
  {
    path: '/chat',
    label: 'Chat inteligente',
    description: 'Habla con el coordinador',
    icon: MessageSquareText,
    available: true,
  },
  {
    path: '/documentos',
    label: 'Documentos',
    description: 'Consulta normativa y acuerdos',
    icon: Files,
    available: true,
  },
  {
    path: '/comunicados',
    label: 'Comunicados',
    description: 'Redacta avisos para vecinos',
    icon: FilePenLine,
    available: true,
  },
  {
    path: '/actas',
    label: 'Actas',
    description: 'Convierte notas en actas',
    icon: ScrollText,
    available: false,
  },
  {
    path: '/incidencias',
    label: 'Incidencias',
    description: 'Clasifica y da seguimiento',
    icon: Wrench,
    available: false,
  },
  {
    path: '/juntas',
    label: 'Preparar junta',
    description: 'Genera el orden del día',
    icon: CalendarDays,
    available: false,
  },
];

export function navigationPathsAreUnique(items: NavigationItem[]) {
  return new Set(items.map(({ path }) => path)).size === items.length;
}
