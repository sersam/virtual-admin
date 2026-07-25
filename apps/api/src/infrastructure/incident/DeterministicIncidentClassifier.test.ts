import { describe, expect, it } from 'vitest';
import { DeterministicIncidentClassifier } from './DeterministicIncidentClassifier.js';

const waterNotice = [
  'Estimados vecinos:',
  '',
  'Se ha registrado la siguiente incidencia: Hay una fuga de agua urgente en el garaje.',
  '',
  'La administración comunicará cualquier novedad relevante.',
].join('\n');

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
        suggestedNotice: waterNotice,
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
        suggestedNotice: [
          'Estimados vecinos:',
          '',
          'Se ha registrado la siguiente incidencia: Hay bolsas de basura en el portal.',
          '',
          'La administración comunicará cualquier novedad relevante.',
        ].join('\n'),
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
        suggestedNotice: [
          'Estimados vecinos:',
          '',
          'Se ha registrado la siguiente incidencia: La zona común requiere revisión.',
          '',
          'La administración comunicará cualquier novedad relevante.',
        ].join('\n'),
      },
      mode: 'deterministic-demo',
    });
  });
});
