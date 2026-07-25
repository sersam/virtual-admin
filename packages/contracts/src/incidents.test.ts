import { describe, expect, it } from 'vitest';
import {
  CreateIncidentRequestSchema,
  CreateIncidentResponseSchema,
  IncidentSchema,
  IncidentListQuerySchema,
  IncidentListResponseSchema,
  ResolveIncidentParamsSchema,
  ResolveIncidentResponseSchema,
} from './incidents.js';

const suggestedNotice = [
  'Estimados vecinos:',
  '',
  'Se ha registrado la siguiente incidencia: Hay una fuga de agua urgente en el garaje.',
  '',
  'La administración comunicará cualquier novedad relevante.',
].join('\n');

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
          suggestedNotice,
          createdAt: '2026-06-27T10:00:00.000Z',
          status: 'pendiente',
          resolvedAt: null,
        },
        mode: 'deterministic-demo',
      }),
    ).toMatchObject({
      incident: {
        type: 'agua',
        priority: 'urgente',
        suggestedResponsible: 'Fontanería',
        suggestedNotice,
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
            suggestedNotice: [
              'Estimados vecinos:',
              '',
              'Se ha registrado la siguiente incidencia: El ascensor no funciona.',
              '',
              'La administración comunicará cualquier novedad relevante.',
            ].join('\n'),
            createdAt: '2026-06-27T10:05:00.000Z',
            status: 'resuelta',
            resolvedAt: '2026-06-27T12:30:00.000Z',
          },
        ],
      }).incidents,
    ).toHaveLength(1);
  });

  it('valida la respuesta de resolución y la coherencia de su estado', () => {
    expect(
      ResolveIncidentResponseSchema.parse({
        incident: {
          id: 'inc-0001',
          description: 'Hay una fuga de agua urgente en el garaje.',
          type: 'agua',
          priority: 'urgente',
          suggestedResponsible: 'Fontanería',
          suggestedNotice,
          createdAt: '2026-06-27T10:00:00.000Z',
          status: 'resuelta',
          resolvedAt: '2026-06-27T12:30:00.000Z',
        },
      }),
    ).toMatchObject({ incident: { status: 'resuelta' } });

    expect(() =>
      ResolveIncidentResponseSchema.parse({
        incident: {
          id: 'inc-0001',
          description: 'Hay una fuga de agua urgente en el garaje.',
          type: 'agua',
          priority: 'urgente',
          suggestedResponsible: 'Fontanería',
          suggestedNotice,
          createdAt: '2026-06-27T10:00:00.000Z',
          status: 'pendiente',
          resolvedAt: '2026-06-27T12:30:00.000Z',
        },
      }),
    ).toThrow();

    expect(() =>
      ResolveIncidentResponseSchema.parse({
        incident: {
          id: 'inc-0001',
          description: 'Hay una fuga de agua urgente en el garaje.',
          type: 'agua',
          priority: 'urgente',
          suggestedResponsible: 'Fontanería',
          suggestedNotice,
          createdAt: '2026-06-27T10:00:00.000Z',
          status: 'resuelta',
          resolvedAt: null,
        },
      }),
    ).toThrow();
  });

  it('valida parámetros de resolución de incidencia', () => {
    expect(ResolveIncidentParamsSchema.parse({ incidentId: ' inc-0001 ' })).toEqual({
      incidentId: 'inc-0001',
    });
    expect(ResolveIncidentParamsSchema.parse({ incidentId: 'a'.repeat(80) })).toEqual({
      incidentId: 'a'.repeat(80),
    });

    expect(() => ResolveIncidentParamsSchema.parse({ incidentId: ' ' })).toThrow();
    expect(() => ResolveIncidentParamsSchema.parse({ incidentId: 'a'.repeat(81) })).toThrow();
    expect(() => ResolveIncidentParamsSchema.parse({})).toThrow();
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
    expect(
      CreateIncidentResponseSchema.parse({
        incident: {
          id: 'inc-0004',
          description: 'Hay una fuga de agua urgente en el garaje.',
          type: 'agua',
          priority: 'urgente',
          suggestedResponsible: 'Fontanería',
          suggestedNotice,
          createdAt: '2026-06-27T10:00:00.000Z',
          status: 'pendiente',
          resolvedAt: null,
        },
        mode: 'openai',
      }).mode,
    ).toBe('openai');
    expect(() =>
      CreateIncidentResponseSchema.parse({
        incident: {
          id: 'inc-0003',
          description: 'Descripción válida de incidencia.',
          type: 'otro',
          priority: 'media',
          suggestedResponsible: 'Administrador',
          suggestedNotice,
          createdAt: 'hoy',
        },
        mode: 'deterministic-demo',
      }),
    ).toThrow();
  });

  it('exige un comunicado sugerido normalizado dentro de la incidencia', () => {
    expect(
      IncidentSchema.parse({
        id: 'inc-0001',
        description: 'Hay una fuga de agua urgente en el garaje.',
        type: 'agua',
        priority: 'urgente',
        suggestedResponsible: 'Fontanería',
        suggestedNotice: `  ${suggestedNotice}  `,
        createdAt: '2026-06-27T10:00:00.000Z',
        status: 'pendiente',
        resolvedAt: null,
      }).suggestedNotice,
    ).toBe(suggestedNotice);

    expect(() =>
      IncidentSchema.parse({
        id: 'inc-0001',
        description: 'Hay una fuga de agua urgente en el garaje.',
        type: 'agua',
        priority: 'urgente',
        suggestedResponsible: 'Fontanería',
        suggestedNotice: ' ',
        createdAt: '2026-06-27T10:00:00.000Z',
        status: 'pendiente',
        resolvedAt: null,
      }),
    ).toThrow();

    expect(() =>
      IncidentSchema.parse({
        id: 'inc-0001',
        description: 'Hay una fuga de agua urgente en el garaje.',
        type: 'agua',
        priority: 'urgente',
        suggestedResponsible: 'Fontanería',
        suggestedNotice: 'a'.repeat(2_001),
        createdAt: '2026-06-27T10:00:00.000Z',
        status: 'pendiente',
        resolvedAt: null,
      }),
    ).toThrow();
  });
});
