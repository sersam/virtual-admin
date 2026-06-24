import { describe, expect, it } from 'vitest';
import { CoordinateChatMessage } from './CoordinateChatMessage.js';

describe('CoordinateChatMessage', () => {
  it('delega la petición libre al workflow de coordinación', async () => {
    const useCase = new CoordinateChatMessage({
      workflow: {
        run: async (message) => ({
          agent: 'general',
          answer: `Coordinado: ${message}`,
          mode: 'langgraph-demo',
          sources: [],
        }),
      },
    });

    await expect(useCase.execute('Hola, ¿qué puedes hacer?')).resolves.toEqual({
      agent: 'general',
      answer: 'Coordinado: Hola, ¿qué puedes hacer?',
      mode: 'langgraph-demo',
      sources: [],
    });
  });
});
