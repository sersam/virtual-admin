import { describe, expect, it } from 'vitest';
import { createLocalDocumentAnswer } from './localDocumentAnswer';

describe('createLocalDocumentAnswer', () => {
  it('devuelve fuentes locales relevantes para piscina', () => {
    const response = createLocalDocumentAnswer('horario piscina');

    expect(response.mode).toBe('local-demo');
    expect(response.sources[0]?.id).toBe('normas-piscina');
  });

  it('explica cuando no hay fuentes locales suficientes', () => {
    const response = createLocalDocumentAnswer('conserjería nocturna');

    expect(response.sources).toEqual([]);
    expect(response.answer).toContain('No he encontrado fuentes suficientes');
  });
});
