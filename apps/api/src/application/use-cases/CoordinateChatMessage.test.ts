import { describe, expect, it } from 'vitest';
import { CoordinateChatMessage } from './CoordinateChatMessage.js';

describe('CoordinateChatMessage', () => {
  it('delega la petición libre al workflow de coordinación', async () => {
    let receivedSessionId: string | undefined;
    const useCase = new CoordinateChatMessage({
      workflow: {
        run: async (message, context) => {
          receivedSessionId = context?.sessionId;

          return {
            agent: 'general',
            answer: `Coordinado: ${message}`,
            mode: 'langgraph-demo',
            sources: [],
          };
        },
      },
    });

    await expect(
      useCase.execute('Hola, ¿qué puedes hacer?', { sessionId: 'session-1' }),
    ).resolves.toEqual({
      agent: 'general',
      answer: 'Coordinado: Hola, ¿qué puedes hacer?',
      mode: 'langgraph-demo',
      sources: [],
    });
    expect(receivedSessionId).toBe('session-1');
  });
});
