import pg from 'pg';

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('Set DATABASE_URL before starting Sweety.');
  return new pg.Pool({ connectionString });
}
