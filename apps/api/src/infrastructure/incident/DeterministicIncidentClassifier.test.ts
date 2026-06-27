import { describe, expect, it } from 'vitest';
import { DeterministicIncidentClassifier } from './DeterministicIncidentClassifier.js';

describe('DeterministicIncidentClassifier', () => {
  it('delega en las reglas deterministas compartidas', () => {
    expect(
      new DeterministicIncidentClassifier().classify('Hay una fuga de agua urgente en el garaje.'),
    ).toEqual({
      type: 'agua',
      priority: 'urgente',
      suggestedResponsible: 'Fontanería',
    });
  });
});
