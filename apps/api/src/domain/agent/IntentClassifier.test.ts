import { describe, expect, it } from 'vitest';
import { classifyIntent } from './IntentClassifier.js';

describe('classifyIntent', () => {
  it.each([
    ['documentos', '¿Qué dicen los estatutos sobre las cuotas extraordinarias?'],
    ['comunicados', 'Redacta un comunicado para avisar del corte de agua del jueves.'],
    ['actas', 'Convierte estas notas en un acta formal de la junta ordinaria.'],
    ['incidencias', 'Hay una fuga en el garaje, clasifica la incidencia y su prioridad.'],
    ['juntas', 'Prepara el orden del día para la próxima junta de propietarios.'],
    ['general', 'Hola, ¿qué puedes hacer por la comunidad?'],
  ] as const)('clasifica %s desde lenguaje natural', (expectedIntent, message) => {
    expect(classifyIntent(message)).toBe(expectedIntent);
  });

  it('prioriza incidencias cuando una avería menciona documentos de forma secundaria', () => {
    expect(
      classifyIntent('Tengo una avería urgente en el ascensor y puedo adjuntar el parte en PDF.'),
    ).toBe('incidencias');
  });

  it('prioriza actas cuando las notas incluyen responsables de tareas', () => {
    expect(
      classifyIntent(
        [
          'Junta ordinaria del 12 de junio.',
          'Acuerdo: aprobar presupuesto.',
          'Tarea: Revisar contrato; Responsable: Ana',
        ].join('\n'),
      ),
    ).toBe('actas');
  });

  it('mantiene documentos cuando una consulta documental menciona un acuerdo', () => {
    expect(classifyIntent('Consulta los documentos adjuntos sobre el acuerdo del ascensor.')).toBe(
      'documentos',
    );
  });

  it('reconoce documentos en plural y consultas explícitas sobre adjuntos', () => {
    expect(classifyIntent('Consulta los documentos adjuntos sobre el contrato del ascensor.')).toBe(
      'documentos',
    );
  });

  it('reconoce mensajes sin tildes ni mayúsculas exactas', () => {
    expect(classifyIntent('necesito preparar una convocatoria para la junta')).toBe('juntas');
  });
});
