import { describe, expect, it } from 'vitest';
import {
  CommunityProposalSchema,
  CreateProposalRequestSchema,
  CreateProposalResponseSchema,
  ProposalListResponseSchema,
} from './proposals.js';

describe('proposal contracts', () => {
  it('valida peticiones y respuestas de propuestas vecinales', () => {
    expect(
      CreateProposalRequestSchema.parse({
        description: '  Instalar aparcabicis en el patio interior.  ',
      }),
    ).toEqual({
      description: 'Instalar aparcabicis en el patio interior.',
    });

    expect(
      CreateProposalResponseSchema.parse({
        proposal: {
          id: 'proposal-0001',
          description: 'Instalar aparcabicis en el patio interior.',
          createdAt: '2026-07-26T10:00:00.000Z',
        },
      }),
    ).toEqual({
      proposal: {
        id: 'proposal-0001',
        description: 'Instalar aparcabicis en el patio interior.',
        createdAt: '2026-07-26T10:00:00.000Z',
      },
    });
  });

  it('rechaza descripciones fuera de limites y campos desconocidos', () => {
    expect(CreateProposalRequestSchema.parse({ description: '1234567890' })).toEqual({
      description: '1234567890',
    });
    expect(CreateProposalRequestSchema.parse({ description: 'a'.repeat(1_000) })).toEqual({
      description: 'a'.repeat(1_000),
    });

    expect(() => CreateProposalRequestSchema.parse({ description: '123456789' })).toThrow();
    expect(() =>
      CreateProposalRequestSchema.parse({ description: `  ${'a'.repeat(9)}  ` }),
    ).toThrow();
    expect(() => CreateProposalRequestSchema.parse({ description: 'a'.repeat(1_001) })).toThrow();
    expect(() =>
      CreateProposalRequestSchema.parse({
        description: 'Instalar aparcabicis en el patio interior.',
        priority: 'alta',
      }),
    ).toThrow();
  });

  it('valida listados y fechas ISO', () => {
    expect(
      ProposalListResponseSchema.parse({
        proposals: [
          {
            id: 'proposal-0002',
            description: 'Crear una zona de compostaje comunitario.',
            createdAt: '2026-07-26T11:00:00.000Z',
          },
        ],
      }).proposals,
    ).toHaveLength(1);

    expect(() =>
      CommunityProposalSchema.parse({
        id: '',
        description: 'Crear una zona de compostaje comunitario.',
        createdAt: '2026-07-26T11:00:00.000Z',
      }),
    ).toThrow();
    expect(() =>
      CommunityProposalSchema.parse({
        id: 'proposal-0002',
        description: 'Crear una zona de compostaje comunitario.',
        createdAt: 'hoy',
      }),
    ).toThrow();
  });
});
