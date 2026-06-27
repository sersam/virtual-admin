const explicitMeetingMinutesKeywords = ['acta', 'actas'] as const;
const supportingMeetingMinutesKeywords = [
  'acuerdo',
  'acuerdos',
  'notas',
  'responsable',
  'responsables',
  'tarea',
  'tareas',
] as const;

export function isMeetingMinutesRequest(message: string): boolean {
  const normalizedMessage = ` ${normalize(message)} `;
  if (
    explicitMeetingMinutesKeywords.some((keyword) => includesKeyword(normalizedMessage, keyword))
  ) {
    return true;
  }

  return (
    supportingMeetingMinutesKeywords.filter((keyword) =>
      includesKeyword(normalizedMessage, keyword),
    ).length >= 2
  );
}

function includesKeyword(normalizedMessage: string, keyword: string): boolean {
  return normalizedMessage.includes(` ${keyword} `);
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, ' ')
    .trim();
}
