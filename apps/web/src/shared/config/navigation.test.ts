import { describe, expect, it } from 'vitest';
import { navigationItems, navigationPathsAreUnique } from './navigation';

describe('navigationItems', () => {
  it('define una única ruta por herramienta', () => {
    expect(navigationPathsAreUnique(navigationItems)).toBe(true);
  });

  it('activa inicio y documentos tras la US-003', () => {
    expect(navigationItems.filter(({ available }) => available).map(({ label }) => label)).toEqual([
      'Inicio',
      'Documentos',
    ]);
  });

  it('detecta rutas duplicadas', () => {
    const firstItem = navigationItems[0];
    expect(firstItem).toBeDefined();
    expect(navigationPathsAreUnique([firstItem!, firstItem!])).toBe(false);
  });
});
