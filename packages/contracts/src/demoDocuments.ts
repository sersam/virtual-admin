import type { DocumentSource } from './documents.js';

export interface DemoCommunityDocument {
  readonly id: string;
  readonly title: string;
  readonly type: DocumentSource['type'];
  readonly section: string;
  readonly documentUrl: string;
  readonly content: string;
}

type DemoDocumentMetadata = Pick<DemoCommunityDocument, 'documentUrl' | 'title' | 'type'>;

const demoDocumentMetadata = {
  communityRules: defineMetadata(
    'Normas de convivencia',
    'normas',
    '/documents/normas-convivencia.pdf',
  ),
  communityStatutes: defineMetadata(
    'Estatutos de la comunidad',
    'estatutos',
    '/documents/estatutos-comunidad.pdf',
  ),
  commonAreaRules: defineMetadata(
    'Normas de uso de zonas comunes',
    'normas',
    '/documents/normas-zonas-comunes.pdf',
  ),
  gardenMaintenanceContract: defineMetadata(
    'Contrato de mantenimiento de jardines',
    'contrato',
    '/documents/contrato-jardines.pdf',
  ),
  marchMeetingMinutes: defineMetadata(
    'Acta ordinaria de marzo de 2026',
    'acta',
    '/documents/acta-marzo-2026.pdf',
  ),
  mayMeetingMinutes: defineMetadata(
    'Acta extraordinaria de mayo de 2026',
    'acta',
    '/documents/acta-mayo-2026.pdf',
  ),
} satisfies Record<string, DemoDocumentMetadata>;

type DemoDocumentMetadataKey = keyof typeof demoDocumentMetadata;

export const demoCommunityDocuments: readonly DemoCommunityDocument[] = [
  defineDemoDocument(
    'estatutos-cuotas',
    'communityStatutes',
    'Cuotas y gastos comunes',
    'Las cuotas ordinarias se calculan según el coeficiente de participación de cada vivienda. Los gastos extraordinarios deben aprobarse en junta por mayoría simple salvo que afecten a elementos estructurales.',
  ),
  defineDemoDocument(
    'normas-piscina',
    'commonAreaRules',
    'Piscina',
    'La piscina comunitaria abre de 10:00 a 21:00 durante la temporada de verano. Los menores de 12 años deben estar acompañados por una persona adulta y no se permite reservar hamacas.',
  ),
  defineDemoDocument(
    'normas-ruido',
    'communityRules',
    'Ruidos y descanso',
    'No se permiten obras ni actividades ruidosas entre las 22:00 y las 8:00. Las celebraciones en terrazas deben finalizar antes de las 00:00 en viernes y sábados.',
  ),
  defineDemoDocument(
    'acta-ascensor',
    'marchMeetingMinutes',
    'Ascensor portal B',
    'La junta aprueba solicitar tres presupuestos para renovar el cuadro de maniobra del ascensor del portal B. La administración presentará comparativa antes del 15 de abril.',
  ),
  defineDemoDocument(
    'acta-placas-solares',
    'mayMeetingMinutes',
    'Instalación fotovoltaica',
    'Se acuerda estudiar la instalación de placas solares para zonas comunes. El administrador recopilará subvenciones disponibles y una estimación de retorno de inversión.',
  ),
  defineDemoDocument(
    'contrato-jardines',
    'gardenMaintenanceContract',
    'Frecuencia de servicio',
    'La empresa Jardines Alba realizará mantenimiento semanal los martes por la mañana. En verano se añade una revisión adicional de riego cada viernes.',
  ),
];

function defineMetadata(
  title: DemoCommunityDocument['title'],
  type: DemoCommunityDocument['type'],
  documentUrl: DemoCommunityDocument['documentUrl'],
): DemoDocumentMetadata {
  return { title, type, documentUrl };
}

function defineDemoDocument(
  id: DemoCommunityDocument['id'],
  metadataKey: DemoDocumentMetadataKey,
  section: DemoCommunityDocument['section'],
  content: DemoCommunityDocument['content'],
): DemoCommunityDocument {
  return {
    id,
    ...demoDocumentMetadata[metadataKey],
    section,
    content,
  };
}
