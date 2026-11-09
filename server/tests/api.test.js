import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import bcrypt from 'bcrypt';
import pg from 'pg';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { calendarToday } from '../src/dates.js';

const connectionString = process.env.TEST_DATABASE_URL;
assert.ok(connectionString, 'Set TEST_DATABASE_URL to a PostgreSQL test database.');
const schema = 'sweety_test_' + randomBytes(8).toString('hex');
const admin = new pg.Pool({ connectionString });
const db = new pg.Pool({ connectionString, options: `-c search_path=${schema}` });
const today = '2026-10-15';
const app = createApp(db, { today: () => today, passwordCost: 4 });
const credentials = { name: 'Fictional User', email: 'fictional@example.test', password: 'Test-password123' };

before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await db.query(await readFile(new URL('../../database/schema.sql', import.meta.url), 'utf8'));
});

after(async () => {
  await db.end();
  try {
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  } finally {
    await admin.end();
  }
});

beforeEach(async () => {
  await db.query('TRUNCATE users CASCADE');
});

async function signup(email = credentials.email) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ ...credentials, email }).expect(201);
  return agent;
}

function add(agent, date = today, slot = 1, value = 105) {
  return agent.post('/api/readings').send({ date, slot, value });
}

function getReport(agent, period, date = today) {
  return agent.get(`/api/reports/${period}`).query({ date }).expect(200).then(({ body }) => body.report);
}

test('registers and logs in with a bcrypt hash, and revokes the session on logout', async () => {
  const agent = request.agent(app);
  const { body, headers } = await agent.post('/api/auth/register').send({
    ...credentials, email: 'Fictional@Example.Test',
  }).expect(201);
  assert.deepEqual(body.user, { id: body.user.id, name: credentials.name, email: credentials.email });
  const cookie = headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  const { rows: [user] } = await db.query('SELECT password_hash FROM users');
  assert.match(user.password_hash, /^\$2[ab]\$/);
  assert.ok(await bcrypt.compare(credentials.password, user.password_hash));
  const { rows: [session] } = await db.query('SELECT token_hash FROM sessions');
  assert.notEqual(session.token_hash, cookie.split(/[=;]/)[1]);
  await agent.get('/api/auth/me').expect(200);
  await agent.post('/api/auth/register').send(credentials).expect(409);
  await agent.delete('/api/auth/session').expect(204);
  await request(app).get('/api/auth/me').set('Cookie', cookie.split(';')[0]).expect(401);
  await agent.post('/api/auth/login').send({ ...credentials, password: 'incorrect' }).expect(401);
  await agent.post('/api/auth/login').send(credentials).expect(200);
  await agent.get('/api/auth/me').expect(200);
});

test('blocks anonymous access and isolates records and reports between accounts', async () => {
  const anonymous = request(app);
  await anonymous.get('/api/readings').expect(401);
  await anonymous.get('/api/reports/daily').query({ date: today }).expect(401);
  await add(anonymous).expect(401);
  const alice = await signup();
  const bob = await signup('other@example.test');
  const { body: { reading } } = await add(alice).expect(201);
  assert.deepEqual((await bob.get('/api/readings').expect(200)).body.readings, []);
  await bob.put(`/api/readings/${reading.id}`).send({ date: today, slot: 2, value: 110 }).expect(404);
  await bob.delete(`/api/readings/${reading.id}`).expect(404);
  assert.equal((await getReport(bob, 'daily')).count, 0);
  await add(bob, today, 1, 220).expect(201);
  assert.equal((await getReport(alice, 'daily')).highest, 105);
  assert.equal((await getReport(bob, 'daily')).highest, 220);
});

test('validates missing, fractional, nonnumeric, and out-of-range glucose values', async () => {
  const agent = await signup();
  for (const body of [{}, { value: null }, { value: '' }]) {
    await agent.post('/api/readings').send({ date: today, slot: 1, ...body }).expect(400)
      .expect({ error: 'Please enter a glucose value.' });
  }
  for (const value of [104.5, '100', true]) {
    await add(agent, today, 1, value).expect(400).expect({ error: 'Glucose value must be a whole number.' });
  }
  for (const value of [39, 601]) {
    await add(agent, today, 1, value).expect(400).expect({ error: 'Value must be between 40 and 600 mg/dl.' });
  }
  await add(agent, today, 1, 40).expect(201);
  await add(agent, today, 2, 600).expect(201);
});

test('rejects impossible and future dates and follows the configured calendar timezone', async () => {
  const agent = await signup();
  await add(agent, '2026-10-16').expect(400).expect({ error: 'Date cannot be in the future.' });
  await add(agent, '2026-02-30').expect(400).expect({ error: 'Choose a valid reading date.' });
  await agent.get('/api/reports/daily').query({ date: '2026-10-16' }).expect(400);
  const instant = new Date('2026-10-15T20:00:00Z');
  assert.equal(calendarToday('Asia/Kolkata', instant), '2026-10-16');
  assert.equal(calendarToday('UTC', instant), today);
});

test('allows four slots, rejects a fifth and handles concurrent duplicate writes', async () => {
  const agent = await signup();
  const attempts = await Promise.all([add(agent, today, 1), add(agent, today, 1)]);
  assert.deepEqual(attempts.map((item) => item.status).sort(), [201, 409]);
  assert.match(attempts.find((item) => item.status === 409).body.error, /Morning \(fasting\)/);
  for (const slot of [2, 3, 4]) await add(agent, today, slot).expect(201);
  await add(agent, today, 5).expect(400);
  await add(agent, today, 4).expect(409);
  assert.equal((await agent.get('/api/readings').expect(200)).body.readings.length, 4);
});

test('updates, validates slot conflicts, and deletes readings', async () => {
  const agent = await signup();
  const { body: { reading } } = await add(agent).expect(201);
  await add(agent, today, 2).expect(201);
  const url = `/api/readings/${reading.id}`;
  await agent.put(url).send({ date: today, slot: 2, value: 111 }).expect(409);
  await agent.put(url).send({ date: today, slot: 1, value: 601 }).expect(400);
  const update = { date: '2026-10-14', slot: 3, value: 115 };
  await agent.put(url).send(update).expect(200).expect({ reading: { id: reading.id, ...update } });
  assert.equal((await getReport(agent, 'daily', update.date)).highest, 115);
  await agent.delete(url).expect(204);
  await agent.delete(url).expect(404);
  assert.equal((await getReport(agent, 'daily', update.date)).count, 0);
});

test('daily report calculates ordered details and rounds the average to one decimal', async () => {
  const agent = await signup();
  await add(agent, today, 3, 145).expect(201);
  await add(agent, today, 1, 99).expect(201);
  await add(agent, today, 2, 120).expect(201);
  assert.deepEqual(await getReport(agent, 'daily'), {
    startDate: today, endDate: today, lowest: 99, highest: 145, average: 121.3, count: 3,
    readings: [{ slot: 1, value: 99 }, { slot: 2, value: 120 }, { slot: 3, value: 145 }],
  });
});

test('month-to-date includes the first and selected days and excludes surrounding dates', async () => {
  const agent = await signup();
  for (const [date, value] of [['2026-09-30', 220], ['2026-10-01', 100], ['2026-10-12', 115], ['2026-10-13', 170]]) {
    await add(agent, date, 1, value).expect(201);
  }
  assert.deepEqual(await getReport(agent, 'month-to-date', '2026-10-12'), {
    startDate: '2026-10-01', endDate: '2026-10-12', lowest: 100, highest: 115, average: 107.5, count: 2,
  });
});

test('previous month uses the entire prior month, including across a year boundary', async () => {
  const agent = await signup();
  for (const [date, value] of [['2025-11-30', 240], ['2025-12-01', 90], ['2025-12-31', 123], ['2026-01-01', 220]]) {
    await add(agent, date, 1, value).expect(201);
  }
  assert.deepEqual(await getReport(agent, 'previous-month', '2026-01-15'), {
    startDate: '2025-12-01', endDate: '2025-12-31', lowest: 90, highest: 123, average: 106.5, count: 2,
  });
});

test('empty reports return no statistics and an empty daily list', async () => {
  const agent = await signup();
  for (const period of ['daily', 'month-to-date', 'previous-month']) {
    const { lowest, highest, average, count, readings } = await getReport(agent, period);
    assert.deepEqual({ lowest, highest, average, count }, { lowest: null, highest: null, average: null, count: 0 });
    assert.deepEqual(readings, period === 'daily' ? [] : undefined);
  }
});
