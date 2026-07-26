import { describe, expect, it } from 'vitest';
import { documentLibrary } from './documentLibrary';

describe('documentLibrary', () => {
  it('publica todos los documentos con enlaces PDF', () => {
    expect(documentLibrary).toHaveLength(9);
    expect(documentLibrary.every(({ documentUrl }) => documentUrl.endsWith('.pdf'))).toBe(true);
  });

  it('mantiene identificadores únicos', () => {
    expect(new Set(documentLibrary.map(({ id }) => id)).size).toBe(documentLibrary.length);
  });

  it('muestra etiquetas espanolas para presupuesto y comunicados', () => {
    expect(documentLibrary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'presupuesto-2026-resumen', type: 'Presupuesto' }),
        expect.objectContaining({ id: 'comunicado-piscina-junio-2026', type: 'Comunicado' }),
        expect.objectContaining({ id: 'comunicado-garaje-julio-2026', type: 'Comunicado' }),
      ]),
    );
  });
});
