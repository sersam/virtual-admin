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

  it('mantiene la prioridad no urgente de las reglas compartidas', () => {
    expect(
      new DeterministicIncidentClassifier().classify('Hay bolsas de basura en el portal.'),
    ).toEqual({
      type: 'limpieza',
      priority: 'baja',
      suggestedResponsible: 'Servicio de limpieza',
    });
  });

  it('usa el fallback compartido para descripciones desconocidas', () => {
    expect(
      new DeterministicIncidentClassifier().classify('La zona común requiere revisión.'),
    ).toEqual({
      type: 'otro',
      priority: 'media',
      suggestedResponsible: 'Administrador',
    });
  });
});
