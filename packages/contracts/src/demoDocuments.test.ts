import { describe, expect, it } from 'vitest';
import { demoCommunityDocuments } from './demoDocuments.js';
import { DocumentSourceSchema } from './documents.js';

describe('demoCommunityDocuments', () => {
  it('mantiene identificadores únicos y enlaces PDF válidos', () => {
    const ids = new Set(demoCommunityDocuments.map(({ id }) => id));

    expect(demoCommunityDocuments).toHaveLength(9);
    expect(ids.size).toBe(demoCommunityDocuments.length);
    demoCommunityDocuments.forEach(({ content, ...source }) => {
      expect(content.length).toBeGreaterThan(20);
      expect(DocumentSourceSchema.omit({ excerpt: true, score: true }).parse(source)).toEqual(
        source,
      );
    });
  });

  it('incluye presupuesto y comunicados históricos enlazados a PDFs reales', () => {
    expect(demoCommunityDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentUrl: '/documents/presupuesto-comunitario-2026.pdf',
          id: 'presupuesto-2026-resumen',
          title: 'Presupuesto comunitario 2026',
          type: 'presupuesto',
        }),
        expect.objectContaining({
          documentUrl: '/documents/comunicado-mantenimiento-piscina-junio-2026.pdf',
          id: 'comunicado-piscina-junio-2026',
          title: 'Comunicado mantenimiento piscina junio 2026',
          type: 'comunicado',
        }),
        expect.objectContaining({
          documentUrl: '/documents/comunicado-revision-garaje-julio-2026.pdf',
          id: 'comunicado-garaje-julio-2026',
          title: 'Comunicado revisión garaje julio 2026',
          type: 'comunicado',
        }),
      ]),
    );
  });
});
