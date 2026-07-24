import { describe, expect, it } from 'vitest';
import { DeterministicIncidentClassifier } from './DeterministicIncidentClassifier.js';

describe('DeterministicIncidentClassifier', () => {
  it('delega en las reglas deterministas compartidas', async () => {
    expect(
      await new DeterministicIncidentClassifier().classify(
        'Hay una fuga de agua urgente en el garaje.',
      ),
    ).toEqual({
      classification: {
        type: 'agua',
        priority: 'urgente',
        suggestedResponsible: 'Fontanería',
      },
      mode: 'deterministic-demo',
    });
  });

  it('mantiene la prioridad no urgente de las reglas compartidas', async () => {
    expect(
      await new DeterministicIncidentClassifier().classify('Hay bolsas de basura en el portal.'),
    ).toEqual({
      classification: {
        type: 'limpieza',
        priority: 'baja',
        suggestedResponsible: 'Servicio de limpieza',
      },
      mode: 'deterministic-demo',
    });
  });

  it('usa el fallback compartido para descripciones desconocidas', async () => {
    expect(
      await new DeterministicIncidentClassifier().classify('La zona común requiere revisión.'),
    ).toEqual({
      classification: {
        type: 'otro',
        priority: 'media',
        suggestedResponsible: 'Administrador',
      },
      mode: 'deterministic-demo',
    });
  });
});
