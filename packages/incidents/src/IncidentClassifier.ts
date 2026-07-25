export type IncidentType =
  | 'agua'
  | 'electricidad'
  | 'ascensor'
  | 'limpieza'
  | 'seguridad'
  | 'convivencia'
  | 'otro';

export type IncidentPriority = 'baja' | 'media' | 'alta' | 'urgente';

export interface IncidentClassification {
  readonly priority: IncidentPriority;
  readonly suggestedNotice: string;
  readonly suggestedResponsible: string;
  readonly type: IncidentType;
}

interface IncidentRule {
  readonly keywords: readonly string[];
  readonly priority: IncidentPriority;
  readonly suggestedResponsible: string;
  readonly type: IncidentType;
  readonly urgentKeywords?: readonly string[];
}

const incidentRules: readonly IncidentRule[] = [
  {
    keywords: ['fuga', 'agua', 'humedad', 'gotera', 'tuberia'],
    priority: 'alta',
    suggestedResponsible: 'Fontanería',
    type: 'agua',
    urgentKeywords: ['urgente', 'inundacion', 'inundado', 'reventada'],
  },
  {
    keywords: ['ascensor', 'elevador'],
    priority: 'alta',
    suggestedResponsible: 'Mantenimiento de ascensores',
    type: 'ascensor',
    urgentKeywords: ['atrapado', 'urgente'],
  },
  {
    keywords: ['luz', 'electricidad', 'enchufe', 'bombilla', 'cuadro electrico'],
    priority: 'media',
    suggestedResponsible: 'Electricista',
    type: 'electricidad',
    urgentKeywords: ['chispas', 'sin luz', 'urgente'],
  },
  {
    keywords: ['basura', 'limpieza', 'sucio', 'portal', 'mancha'],
    priority: 'baja',
    suggestedResponsible: 'Servicio de limpieza',
    type: 'limpieza',
  },
  {
    keywords: ['puerta', 'cerradura', 'robo', 'seguridad'],
    priority: 'alta',
    suggestedResponsible: 'Seguridad',
    type: 'seguridad',
    urgentKeywords: ['robo', 'forzada', 'abierta'],
  },
  {
    keywords: ['ruido', 'molestia', 'vecino', 'convivencia'],
    priority: 'media',
    suggestedResponsible: 'Administrador',
    type: 'convivencia',
  },
];

const fallbackClassification = {
  priority: 'media',
  suggestedResponsible: 'Administrador',
  type: 'otro',
} satisfies Omit<IncidentClassification, 'suggestedNotice'>;

export function classifyIncident(description: string): IncidentClassification {
  const normalizedDescription = normalize(description);
  const suggestedNotice = buildSuggestedNotice(description.trim());
  const matchedRule = incidentRules.find((rule) =>
    rule.keywords.some((keyword) => includesKeyword(normalizedDescription, keyword)),
  );

  if (!matchedRule) return { ...fallbackClassification, suggestedNotice };

  return {
    priority: hasUrgentSignal(normalizedDescription, matchedRule)
      ? 'urgente'
      : matchedRule.priority,
    suggestedNotice,
    suggestedResponsible: matchedRule.suggestedResponsible,
    type: matchedRule.type,
  };
}

function buildSuggestedNotice(description: string): string {
  return [
    'Estimados vecinos:',
    '',
    `Se ha registrado la siguiente incidencia: ${description}`,
    '',
    'La administración comunicará cualquier novedad relevante.',
  ].join('\n');
}

function hasUrgentSignal(normalizedDescription: string, rule: IncidentRule): boolean {
  return (
    rule.urgentKeywords?.some((keyword) => includesKeyword(normalizedDescription, keyword)) ?? false
  );
}

function includesKeyword(normalizedDescription: string, keyword: string): boolean {
  const descriptionWords = splitWords(normalizedDescription);
  const keywordWords = splitWords(normalize(keyword));

  return descriptionWords.some((_, index) =>
    keywordWords.every((word, offset) => descriptionWords[index + offset] === word),
  );
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function splitWords(text: string): string[] {
  return text.split(/[^a-z0-9]+/u).filter(Boolean);
}
