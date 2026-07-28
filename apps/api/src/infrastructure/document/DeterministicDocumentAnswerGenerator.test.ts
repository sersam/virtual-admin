import { describe, expect, it } from 'vitest';
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
});
