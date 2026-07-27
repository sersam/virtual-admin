import { describe, expect, it, vi } from 'vitest';
import { createPostgresPool } from './createPostgresPool.js';

describe('createPostgresPool', () => {
  it('observa errores de clientes inactivos del pool', async () => {
    const pool = createPostgresPool({
      connectionString: 'postgres://test:test@127.0.0.1:1/test',
      logIdleClientErrors: false,
    });

    try {
      expect(pool.listenerCount('error')).toBe(1);
      expect(() => pool.emit('error', new Error('Conexion idle cerrada'))).not.toThrow();
    } finally {
      await pool.end();
    }
  });

  it('registra los errores de clientes inactivos por defecto', async () => {
    const error = new Error('Conexion idle cerrada');
    const pool = createPostgresPool({
      connectionString: 'postgres://test:test@127.0.0.1:1/test',
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      pool.emit('error', error);

      expect(consoleError).toHaveBeenCalledWith(
        'Error en un cliente inactivo del pool PostgreSQL',
        error,
      );
    } finally {
      consoleError.mockRestore();
      await pool.end();
    }
  });
});
