import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createPool } from '../server/src/db.js';
import { calendarToday } from '../server/src/dates.js';

const email = 'demo@sweety.example';
const password = 'SweetyDemo2026!';
const db = createPool();

try {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash) VALUES ('Demo User', $1, $2)
       ON CONFLICT (email) DO NOTHING`, [email, hash]);
    const { rows: [user] } = await client.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
    if (!await bcrypt.compare(password, user.password_hash)) throw new Error('Demo email is already in use.');

    await client.query(
      `WITH dates AS (
         SELECT $2::date AS today, date_trunc('month', $2::date::timestamp)::date AS month_start
       )
       INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
       SELECT $1, demo.day, demo.slot, demo.value FROM dates CROSS JOIN LATERAL (
         VALUES (today, 1, 96), (today, 2, 132), (today, 3, 144), (today, 4, 119),
                (month_start, 1, 101), (month_start, 3, 137),
                (month_start - 1, 1, 94), (month_start - 1, 4, 124),
                (month_start - 5, 2, 128), (month_start - 5, 3, 142)
       ) AS demo(day, slot, value)
       ON CONFLICT (user_id, reading_date, time_slot) DO NOTHING`,
      [user.id, calendarToday()]);
    await client.query('COMMIT');
    console.log(`Demo account ready: ${email}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await db.end();
}
