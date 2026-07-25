import { describe, expect, it } from 'vitest';
import { classifyIncident } from './IncidentClassifier.js';

const waterNotice = [
  'Estimados vecinos:',
  '',
  'Se ha registrado la siguiente incidencia: Hay una fuga de agua urgente en el garaje.',
  '',
  'La administración comunicará cualquier novedad relevante.',
].join('\n');

describe('classifyIncident', () => {
  it('clasifica fugas urgentes como incidencia de agua urgente', () => {
    expect(classifyIncident('Hay una fuga de agua urgente en el garaje.')).toEqual({
      type: 'agua',
      priority: 'urgente',
      suggestedResponsible: 'Fontanería',
      suggestedNotice: waterNotice,
    });
  });

  it('clasifica averías de ascensor con responsable específico', () => {
    expect(classifyIncident('El ascensor no funciona desde esta mañana.')).toEqual({
      type: 'ascensor',
      priority: 'alta',
      suggestedResponsible: 'Mantenimiento de ascensores',
      suggestedNotice: [
        'Estimados vecinos:',
        '',
        'Se ha registrado la siguiente incidencia: El ascensor no funciona desde esta mañana.',
        '',
        'La administración comunicará cualquier novedad relevante.',
      ].join('\n'),
    });
  });

  it('clasifica incidencias de limpieza con prioridad baja', () => {
    expect(classifyIncident('Hay bolsas de basura en el portal.')).toEqual({
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
    });
  });

  it('usa reglas fallback para incidencias sin tipo claro', () => {
    expect(classifyIncident('La zona común necesita una revisión general.')).toEqual({
      type: 'otro',
      priority: 'media',
      suggestedResponsible: 'Administrador',
      suggestedNotice: [
        'Estimados vecinos:',
        '',
        'Se ha registrado la siguiente incidencia: La zona común necesita una revisión general.',
        '',
        'La administración comunicará cualquier novedad relevante.',
      ].join('\n'),
    });
  });

  it('no clasifica coincidencias parciales como palabras válidas', () => {
    expect(classifyIncident('Se ha perdido un paraguas en la entrada principal.')).toEqual({
      type: 'otro',
      priority: 'media',
      suggestedResponsible: 'Administrador',
      suggestedNotice: [
        'Estimados vecinos:',
        '',
        'Se ha registrado la siguiente incidencia: Se ha perdido un paraguas en la entrada principal.',
        '',
        'La administración comunicará cualquier novedad relevante.',
      ].join('\n'),
    });
  });

  it('clasifica texto con diacríticos normalizados', () => {
    expect(classifyIncident('La tubería está reventada y causa una inundación.')).toEqual({
      type: 'agua',
      priority: 'urgente',
      suggestedResponsible: 'Fontanería',
      suggestedNotice: [
        'Estimados vecinos:',
        '',
        'Se ha registrado la siguiente incidencia: La tubería está reventada y causa una inundación.',
        '',
        'La administración comunicará cualquier novedad relevante.',
      ].join('\n'),
    });
  });

  it('usa la descripción normalizada para construir el comunicado sugerido', () => {
    expect(classifyIncident('  Hay una fuga de agua urgente en el garaje.  ').suggestedNotice).toBe(
      waterNotice,
    );
  });
});
