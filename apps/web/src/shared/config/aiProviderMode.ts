import type { AiFallbackReason, AiProviderMode } from '@admin/contracts';

export function formatAiProviderMode(mode: AiProviderMode): string {
  return mode === 'openai' ? 'OpenAI · GPT-5 nano' : 'Demo determinista';
}

export function formatAiFallbackReason(reason: AiFallbackReason): string {
  const labels: Record<AiFallbackReason, string> = {
    'ip-quota': 'Se ha usado el modo determinista porque la IP alcanzó el límite diario de IA.',
    'provider-error': 'Se ha usado el modo determinista porque OpenAI no respondió correctamente.',
    'quota-unavailable':
      'Se ha usado el modo determinista porque el control de límites no está disponible.',
    'session-quota':
      'Se ha usado el modo determinista porque esta sesión alcanzó el límite diario de IA.',
  };

  return labels[reason];
}
