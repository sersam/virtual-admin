import { describe, expect, it } from 'vitest';
import { classifyIncident } from './IncidentClassifier.js';

describe('classifyIncident', () => {
  it('clasifica fugas urgentes como incidencia de agua urgente', () => {
    expect(classifyIncident('Hay una fuga de agua urgente en el garaje.')).toEqual({
      type: 'agua',
      priority: 'urgente',
      suggestedResponsible: 'Fontanería',
    });
  });

  it('clasifica averías de ascensor con responsable específico', () => {
    expect(classifyIncident('El ascensor no funciona desde esta mañana.')).toEqual({
      type: 'ascensor',
      priority: 'alta',
      suggestedResponsible: 'Mantenimiento de ascensores',
    });
  });

  it('clasifica incidencias de limpieza con prioridad baja', () => {
    expect(classifyIncident('Hay bolsas de basura en el portal.')).toEqual({
      type: 'limpieza',
      priority: 'baja',
      suggestedResponsible: 'Servicio de limpieza',
    });
  });

  it('usa reglas fallback para incidencias sin tipo claro', () => {
    expect(classifyIncident('La zona común necesita una revisión general.')).toEqual({
      type: 'otro',
      priority: 'media',
      suggestedResponsible: 'Administrador',
    });
  });
});
