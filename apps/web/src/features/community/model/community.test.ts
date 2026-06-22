import { describe, expect, it } from 'vitest';
import { community, communityStats } from './community';

describe('communityStats', () => {
  it('calcula el resumen a partir de los datos de comunidad', () => {
    expect(communityStats(community)).toEqual({ documents: 5, homesPerBuilding: 24 });
  });

  it('mantiene identificadores documentales únicos', () => {
    const ids = community.documents.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rechaza comunidades sin bloques para evitar métricas infinitas', () => {
    expect(() => communityStats({ ...community, buildings: 0 })).toThrow(
      'El número de bloques debe ser mayor que cero',
    );
  });
});
