export interface CommunityDocumentSummary {
  id: string;
  title: string;
  category: 'Normativa' | 'Actas' | 'Economía' | 'Contratos';
  updatedAt: string;
}

export interface CommunitySummary {
  name: string;
  location: string;
  homes: number;
  buildings: number;
  openIncidents: number;
  nextMeeting: string;
  documents: CommunityDocumentSummary[];
}

export const community: CommunitySummary = {
  name: 'Residencial Sierra Nevada',
  location: 'Granada, Andalucía',
  homes: 72,
  buildings: 3,
  openIncidents: 4,
  nextMeeting: '18 de septiembre',
  documents: [
    {
      id: 'estatutos-2020',
      title: 'Estatutos de la comunidad',
      category: 'Normativa',
      updatedAt: '15 feb 2020',
    },
    {
      id: 'normas-2023',
      title: 'Normas de régimen interior',
      category: 'Normativa',
      updatedAt: '8 may 2023',
    },
    {
      id: 'acta-2024',
      title: 'Junta ordinaria 2024',
      category: 'Actas',
      updatedAt: '21 mar 2024',
    },
    {
      id: 'presupuesto-2025',
      title: 'Presupuesto comunitario 2025',
      category: 'Economía',
      updatedAt: '10 feb 2025',
    },
    {
      id: 'contrato-ascensores',
      title: 'Mantenimiento de ascensores',
      category: 'Contratos',
      updatedAt: '1 sep 2024',
    },
  ],
};

export function communityStats(summary: CommunitySummary) {
  if (summary.buildings <= 0) {
    throw new RangeError('El número de bloques debe ser mayor que cero');
  }

  return {
    documents: summary.documents.length,
    homesPerBuilding: summary.homes / summary.buildings,
  };
}
