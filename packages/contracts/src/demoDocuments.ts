import type { DocumentSource } from './documents.js';

export interface DemoCommunityDocument {
  readonly id: string;
  readonly title: string;
  readonly type: DocumentSource['type'];
  readonly section: string;
  readonly documentUrl: string;
  readonly content: string;
}

export const demoCommunityDocuments: readonly DemoCommunityDocument[] = [
  {
    id: 'estatutos-cuotas',
    title: 'Estatutos de la comunidad',
    type: 'estatutos',
    section: 'Cuotas y gastos comunes',
    documentUrl: '/documents/estatutos-comunidad.pdf',
    content:
      'Las cuotas ordinarias se calculan según el coeficiente de participación de cada vivienda. Los gastos extraordinarios deben aprobarse en junta por mayoría simple salvo que afecten a elementos estructurales.',
  },
  {
    id: 'normas-piscina',
    title: 'Normas de uso de zonas comunes',
    type: 'normas',
    section: 'Piscina',
    documentUrl: '/documents/normas-zonas-comunes.pdf',
    content:
      'La piscina comunitaria abre de 10:00 a 21:00 durante la temporada de verano. Los menores de 12 años deben estar acompañados por una persona adulta y no se permite reservar hamacas.',
  },
  {
    id: 'normas-ruido',
    title: 'Normas de convivencia',
    type: 'normas',
    section: 'Ruidos y descanso',
    documentUrl: '/documents/normas-convivencia.pdf',
    content:
      'No se permiten obras ni actividades ruidosas entre las 22:00 y las 8:00. Las celebraciones en terrazas deben finalizar antes de las 00:00 en viernes y sábados.',
  },
  {
    id: 'acta-ascensor',
    title: 'Acta ordinaria de marzo de 2026',
    type: 'acta',
    section: 'Ascensor portal B',
    documentUrl: '/documents/acta-marzo-2026.pdf',
    content:
      'La junta aprueba solicitar tres presupuestos para renovar el cuadro de maniobra del ascensor del portal B. La administración presentará comparativa antes del 15 de abril.',
  },
  {
    id: 'acta-placas-solares',
    title: 'Acta extraordinaria de mayo de 2026',
    type: 'acta',
    section: 'Instalación fotovoltaica',
    documentUrl: '/documents/acta-mayo-2026.pdf',
    content:
      'Se acuerda estudiar la instalación de placas solares para zonas comunes. El administrador recopilará subvenciones disponibles y una estimación de retorno de inversión.',
  },
  {
    id: 'contrato-jardines',
    title: 'Contrato de mantenimiento de jardines',
    type: 'contrato',
    section: 'Frecuencia de servicio',
    documentUrl: '/documents/contrato-jardines.pdf',
    content:
      'La empresa Jardines Alba realizará mantenimiento semanal los martes por la mañana. En verano se añade una revisión adicional de riego cada viernes.',
  },
];
