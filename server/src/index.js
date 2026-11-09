import 'dotenv/config';
import { createApp } from './app.js';
import { calendarToday } from './dates.js';
import { createPool } from './db.js';

const db = createPool();
const port = Number(process.env.PORT || 3000);
const secureCookies = process.env.NODE_ENV === 'production';
const host = process.env.HOST || '127.0.0.1';
try {
  calendarToday();
  await db.query('SELECT 1 FROM sessions LIMIT 1');
} catch (error) {
  await db.end();
  throw error;
}

db.on('error', (error) => console.error('PostgreSQL pool error:', error.message));
createApp(db, { secureCookies }).listen(port, host, () => {
  console.log(`Sweety listening at http://${host}:${port}`);
});
