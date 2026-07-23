import { describe, expect, it } from 'vitest';
import {
  CreateIncidentRequestSchema,
  CreateIncidentResponseSchema,
  IncidentListQuerySchema,
  IncidentListResponseSchema,
} from './incidents.js';

describe('incident contracts', () => {
  it('valida peticiones y respuestas de creación de incidencia', () => {
    expect(
      CreateIncidentRequestSchema.parse({
        description: '  Hay una fuga de agua urgente en el garaje.  ',
      }),
    ).toEqual({
      description: 'Hay una fuga de agua urgente en el garaje.',
    });

    expect(
      CreateIncidentResponseSchema.parse({
        incident: {
          id: 'inc-0001',
          description: 'Hay una fuga de agua urgente en el garaje.',
          type: 'agua',
          priority: 'urgente',
          suggestedResponsible: 'Fontanería',
          createdAt: '2026-06-27T10:00:00.000Z',
        },
        mode: 'deterministic-demo',
      }),
    ).toMatchObject({
      incident: {
        type: 'agua',
        priority: 'urgente',
        suggestedResponsible: 'Fontanería',
      },
    });
  });

  it('valida filtros por tipo y listados de incidencias', () => {
    expect(IncidentListQuerySchema.parse({ type: 'ascensor' })).toEqual({ type: 'ascensor' });
    expect(IncidentListQuerySchema.parse({})).toEqual({});

    expect(
      IncidentListResponseSchema.parse({
        incidents: [
          {
            id: 'inc-0002',
            description: 'El ascensor no funciona.',
            type: 'ascensor',
            priority: 'alta',
            suggestedResponsible: 'Mantenimiento de ascensores',
            createdAt: '2026-06-27T10:05:00.000Z',
          },
        ],
      }).incidents,
    ).toHaveLength(1);
  });

  it('rechaza descripciones cortas, tipos inválidos y fechas inválidas', () => {
    expect(CreateIncidentRequestSchema.parse({ description: '1234567890' })).toEqual({
      description: '1234567890',
    });
    expect(CreateIncidentRequestSchema.parse({ description: 'a'.repeat(1_000) })).toEqual({
      description: 'a'.repeat(1_000),
    });
    expect(() => CreateIncidentRequestSchema.parse({ description: 'Fuga' })).toThrow();
    expect(() => CreateIncidentRequestSchema.parse({ description: '123456789' })).toThrow();
    expect(() =>
      CreateIncidentRequestSchema.parse({ description: `  ${'a'.repeat(9)}  ` }),
    ).toThrow();
    expect(() => CreateIncidentRequestSchema.parse({ description: 'a'.repeat(1_001) })).toThrow();
    expect(() => IncidentListQuerySchema.parse({ type: 'jardineria' })).toThrow();
    expect(() =>
      CreateIncidentResponseSchema.parse({
        incident: {
          id: 'inc-0003',
          description: 'Descripción válida de incidencia.',
          type: 'otro',
          priority: 'media',
          suggestedResponsible: 'Administrador',
          createdAt: 'hoy',
        },
        mode: 'deterministic-demo',
      }),
    ).toThrow();
  });
});
