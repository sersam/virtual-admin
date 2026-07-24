import type { AiProviderMode } from '@admin/contracts';

export function formatAiProviderMode(mode: AiProviderMode): string {
  return mode === 'openai' ? 'OpenAI · GPT-5 nano' : 'Demo determinista';
}
