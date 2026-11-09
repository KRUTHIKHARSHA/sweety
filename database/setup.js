import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createPool } from '../server/src/db.js';

const pool = createPool();
try {
  await pool.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  console.log('Sweety schema is ready.');
} finally {
  await pool.end();
}
