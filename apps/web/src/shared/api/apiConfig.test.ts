import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './apiConfig';

describe('resolveApiBaseUrl', () => {
  it('respeta la URL configurada explícitamente', () => {
    expect(
      resolveApiBaseUrl('http://api.local:4000', {
        hostname: 'localhost',
        protocol: 'http:',
      }),
    ).toBe('http://api.local:4000');
  });

  it('usa rutas relativas en navegador para evitar CORS en desarrollo local', () => {
    expect(
      resolveApiBaseUrl(undefined, {
        hostname: 'localhost',
        protocol: 'http:',
      }),
    ).toBe('');
  });

  it('mantiene el fallback estable fuera del navegador', () => {
    expect(resolveApiBaseUrl(undefined, null)).toBe('http://127.0.0.1:3000');
  });
});
