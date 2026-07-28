import { describe, expect, it } from 'vitest';
import { PostgresDocumentChunkRepository } from './PostgresDocumentChunkRepository.js';

describe('PostgresDocumentChunkRepository', () => {
  it('serializa vectores para pgvector', () => {
    expect(PostgresDocumentChunkRepository.toSqlVector([0.1, -2, 3.25])).toBe('[0.1,-2,3.25]');
  });

  it('rechaza vectores no finitos antes de enviarlos a PostgreSQL', () => {
    expect(() => PostgresDocumentChunkRepository.toSqlVector([0.1, Number.NaN])).toThrow(
      'El vector documental contiene valores invalidos.',
    );
  });
});
