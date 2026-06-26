import { describe, expect, it } from 'vitest';
import { navigationItems, navigationPathsAreUnique } from './navigation';

describe('navigationItems', () => {
  it('define una única ruta por herramienta', () => {
    expect(navigationPathsAreUnique(navigationItems)).toBe(true);
  });

  it('activa inicio, chat, documentos y comunicados tras la US-005', () => {
    expect(navigationItems.filter(({ available }) => available).map(({ label }) => label)).toEqual([
      'Inicio',
      'Chat inteligente',
      'Documentos',
      'Comunicados',
    ]);
  });

  it('detecta rutas duplicadas', () => {
    const firstItem = navigationItems[0];
    expect(firstItem).toBeDefined();
    expect(navigationPathsAreUnique([firstItem!, firstItem!])).toBe(false);
  });
});
