import { describe, expect, it } from 'vitest';
import { AiProviderError } from '../../application/ports/AiProviderError.js';
import { DeterministicDocumentAnswerGenerator } from './DeterministicDocumentAnswerGenerator.js';

describe('DeterministicDocumentAnswerGenerator', () => {
  it('redacta una respuesta reproducible desde las evidencias recibidas', async () => {
    const generator = new DeterministicDocumentAnswerGenerator();

    const response = await generator.generate({
      question: '¿Cuál es el horario de piscina?',
      evidence: [
        {
          id: 'normas-piscina',
          title: 'Normas de piscina',
          section: 'Horarios',
          content: 'La piscina abre de 10:00 a 21:00 todos los días de verano.',
        },
        {
          id: 'acta-junio',
          title: 'Acta de junio',
          section: 'Ruegos',
          content: 'Se revisará la señalización de la piscina.',
        },
      ],
    });

    expect(response).toEqual({
      answer:
        'Según la documentación recuperada, La piscina abre de 10:00 a 21:00 todos los días de verano. He usado como fuentes: Normas de piscina, sección Horarios; Acta de junio, sección Ruegos.',
      sourceIds: ['normas-piscina', 'acta-junio'],
      mode: 'deterministic-demo',
    });
  });

  it('redacta una respuesta reproducible con una sola evidencia', async () => {
    const generator = new DeterministicDocumentAnswerGenerator();

    await expect(
      generator.generate({
        question: '¿Cuál es el horario de piscina?',
        evidence: [
          {
            id: 'normas-piscina',
            title: 'Normas de piscina',
            section: 'Horarios',
            content: 'La piscina abre de 10:00 a 21:00.',
          },
        ],
      }),
    ).resolves.toEqual({
      answer:
        'Según la documentación recuperada, La piscina abre de 10:00 a 21:00. He usado como fuentes: Normas de piscina, sección Horarios.',
      sourceIds: ['normas-piscina'],
      mode: 'deterministic-demo',
    });
  });

  it('acepta el máximo de tres evidencias permitidas', async () => {
    const generator = new DeterministicDocumentAnswerGenerator();

    const response = await generator.generate({
      question: '¿Qué fuentes se recuperaron?',
      evidence: [
        {
          id: 'normas-piscina',
          title: 'Normas de piscina',
          section: 'Horarios',
          content: 'La piscina abre de 10:00 a 21:00.',
        },
        {
          id: 'acta-junio',
          title: 'Acta de junio',
          section: 'Ruegos',
          content: 'Se revisará la señalización.',
        },
        {
          id: 'contrato-jardines',
          title: 'Contrato de jardines',
          section: 'Mantenimiento',
          content: 'El contrato incluye poda mensual.',
        },
      ],
    });

    expect(response.sourceIds).toEqual(['normas-piscina', 'acta-junio', 'contrato-jardines']);
    expect(response.mode).toBe('deterministic-demo');
    expect(response.answer).toContain('Contrato de jardines, sección Mantenimiento');
  });

  it('rechaza listas de evidencias vacías o superiores al máximo permitido', async () => {
    const generator = new DeterministicDocumentAnswerGenerator();

    await expect(
      generator.generate({
        question: '¿Cuál es el horario de piscina?',
        evidence: [],
      }),
    ).rejects.toBeInstanceOf(AiProviderError);
    await expect(
      generator.generate({
        question: '¿Cuál es el horario de piscina?',
        evidence: [
          {
            id: 'normas-piscina',
            title: 'Normas de piscina',
            section: 'Horarios',
            content: 'La piscina abre de 10:00 a 21:00.',
          },
          {
            id: 'acta-junio',
            title: 'Acta de junio',
            section: 'Ruegos',
            content: 'Se revisará la señalización.',
          },
          {
            id: 'contrato-jardines',
            title: 'Contrato de jardines',
            section: 'Mantenimiento',
            content: 'El contrato incluye poda mensual.',
          },
          {
            id: 'normas-ruido',
            title: 'Normas de ruido',
            section: 'Descanso',
            content: 'Las actividades ruidosas terminan a las 22:00.',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(AiProviderError);
  });

  it('rechaza evidencias incompletas', async () => {
    const generator = new DeterministicDocumentAnswerGenerator();

    await expect(
      generator.generate({
        question: '¿Cuál es el horario de piscina?',
        evidence: [
          {
            id: ' ',
            title: 'Normas de piscina',
            section: 'Horarios',
            content: 'La piscina abre de 10:00 a 21:00.',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(AiProviderError);
    await expect(
      generator.generate({
        question: '¿Cuál es el horario de piscina?',
        evidence: [
          {
            id: 'normas-piscina',
            title: 'Normas de piscina',
            section: 'Horarios',
            content: ' ',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(AiProviderError);
  });
});
