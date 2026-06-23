export interface LibraryDocument {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly section: string;
  readonly documentUrl: string;
}

export const documentLibrary: LibraryDocument[] = [
  {
    id: 'estatutos-cuotas',
    title: 'Estatutos de la comunidad',
    type: 'Estatutos',
    section: 'Cuotas y gastos comunes',
    documentUrl: '/documents/estatutos-comunidad.pdf',
  },
  {
    id: 'normas-piscina',
    title: 'Normas de uso de zonas comunes',
    type: 'Normas',
    section: 'Piscina',
    documentUrl: '/documents/normas-zonas-comunes.pdf',
  },
  {
    id: 'normas-ruido',
    title: 'Normas de convivencia',
    type: 'Normas',
    section: 'Ruidos y descanso',
    documentUrl: '/documents/normas-convivencia.pdf',
  },
  {
    id: 'acta-ascensor',
    title: 'Acta ordinaria de marzo de 2026',
    type: 'Acta',
    section: 'Ascensor portal B',
    documentUrl: '/documents/acta-marzo-2026.pdf',
  },
  {
    id: 'acta-placas-solares',
    title: 'Acta extraordinaria de mayo de 2026',
    type: 'Acta',
    section: 'Instalación fotovoltaica',
    documentUrl: '/documents/acta-mayo-2026.pdf',
  },
  {
    id: 'contrato-jardines',
    title: 'Contrato de mantenimiento de jardines',
    type: 'Contrato',
    section: 'Frecuencia de servicio',
    documentUrl: '/documents/contrato-jardines.pdf',
  },
];
