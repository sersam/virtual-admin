import pg from 'pg';

const { Pool } = pg;

interface CreatePostgresPoolOptions {
  readonly connectionString: string;
  readonly connectionTimeoutMillis?: number;
  readonly logIdleClientErrors?: boolean;
}

export function createPostgresPool(options: CreatePostgresPoolOptions): pg.Pool {
  const pool = new Pool({
    connectionString: options.connectionString,
    connectionTimeoutMillis: options.connectionTimeoutMillis,
  });

  pool.on('error', (error) => {
    if (options.logIdleClientErrors ?? true) {
      console.error('Error en un cliente inactivo del pool PostgreSQL', error);
    }
  });

  return pool;
}
