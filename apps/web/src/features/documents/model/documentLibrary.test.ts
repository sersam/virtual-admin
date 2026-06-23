import { describe, expect, it } from 'vitest';
import { documentLibrary } from './documentLibrary';

describe('documentLibrary', () => {
  it('publica todos los documentos con enlaces PDF', () => {
    expect(documentLibrary).toHaveLength(6);
    expect(documentLibrary.every(({ documentUrl }) => documentUrl.endsWith('.pdf'))).toBe(true);
  });

  it('mantiene identificadores únicos', () => {
    expect(new Set(documentLibrary.map(({ id }) => id)).size).toBe(documentLibrary.length);
  });
});
