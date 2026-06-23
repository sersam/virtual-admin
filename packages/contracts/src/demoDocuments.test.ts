import { describe, expect, it } from 'vitest';
import { demoCommunityDocuments } from './demoDocuments.js';
import { DocumentSourceSchema } from './documents.js';

describe('demoCommunityDocuments', () => {
  it('mantiene identificadores únicos y enlaces PDF válidos', () => {
    const ids = new Set(demoCommunityDocuments.map(({ id }) => id));

    expect(ids.size).toBe(demoCommunityDocuments.length);
    demoCommunityDocuments.forEach(({ content, ...source }) => {
      expect(content.length).toBeGreaterThan(20);
      expect(DocumentSourceSchema.omit({ excerpt: true, score: true }).parse(source)).toEqual(
        source,
      );
    });
  });
});
