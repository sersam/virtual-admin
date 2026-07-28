import { describe, expect, it } from 'vitest';
import { DeterministicChatIntentClassifier } from './DeterministicChatIntentClassifier.js';

describe('DeterministicChatIntentClassifier', () => {
  it.each([
    ['documentos', '¿Qué dicen los estatutos sobre las cuotas extraordinarias?'],
    ['comunicados', 'Redacta un comunicado para avisar del corte de agua del jueves.'],
    ['actas', 'Convierte estas notas en un acta formal de la junta ordinaria.'],
    ['incidencias', 'Hay una fuga en el garaje, clasifica la incidencia y su prioridad.'],
    ['juntas', 'Prepara el orden del día para la próxima junta de propietarios.'],
    ['general', 'Hola, ¿qué puedes hacer por la comunidad?'],
  ] as const)('clasifica %s con trazabilidad demo', async (agent, message) => {
    const classifier = new DeterministicChatIntentClassifier();

    await expect(classifier.classify(message)).resolves.toEqual({
      agent,
      provider: 'deterministic-demo',
    });
  });

  it('conserva las prioridades actuales ante mensajes ambiguos', async () => {
    const classifier = new DeterministicChatIntentClassifier();

    await expect(
      classifier.classify(
        'Tengo una avería urgente en el ascensor y puedo adjuntar el parte en PDF.',
      ),
    ).resolves.toEqual({
      agent: 'incidencias',
      provider: 'deterministic-demo',
    });
  });
});
