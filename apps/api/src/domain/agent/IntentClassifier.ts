export type AgentIntent =
  | 'documentos'
  | 'comunicados'
  | 'actas'
  | 'incidencias'
  | 'juntas'
  | 'general';

const intentKeywords: ReadonlyArray<{
  readonly intent: AgentIntent;
  readonly keywords: readonly string[];
}> = [
  // El orden expresa prioridad cuando una petición encaja en varias áreas del MVP.
  {
    intent: 'incidencias',
    keywords: ['averia', 'fuga', 'incidencia', 'prioridad', 'reparacion', 'responsable', 'urgente'],
  },
  {
    intent: 'comunicados',
    keywords: ['aviso', 'avisar', 'comunicacion', 'comunicado', 'redacta', 'vecinos'],
  },
  {
    intent: 'actas',
    keywords: ['acta', 'acuerdo', 'acuerdos', 'notas', 'secretario'],
  },
  {
    intent: 'juntas',
    keywords: ['convocatoria', 'junta', 'orden del dia', 'reunion'],
  },
  {
    intent: 'documentos',
    keywords: [
      'adjunto',
      'adjuntos',
      'contrato',
      'documento',
      'documentos',
      'estatuto',
      'estatutos',
      'norma',
      'normas',
      'pdf',
    ],
  },
];

export function classifyIntent(message: string): AgentIntent {
  const normalizedMessage = ` ${normalize(message)} `;
  const match = intentKeywords.find(({ keywords }) =>
    keywords.some((keyword) => normalizedMessage.includes(` ${keyword} `)),
  );

  return match?.intent ?? 'general';
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, ' ')
    .trim();
}
