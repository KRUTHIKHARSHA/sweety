import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

const cookieName = 'sweety_session';
const lifetime = 7 * 24 * 60 * 60 * 1000;
const invalidLogin = 'Email or password is incorrect.';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function sessionHash(req) {
  const match = req.headers.cookie?.match(/(?:^|;\s*)sweety_session=([a-f0-9]{64})(?:;|$)/);
  return match ? hashToken(match[1]) : null;
}

export function authRoutes(db, today, { secureCookies, passwordCost }) {
  const router = Router();
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: secureCookies, path: '/' };
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  });
  const fallbackHash = bcrypt.hash(randomBytes(32).toString('hex'), passwordCost);

  async function startSession(req, res, user, status) {
    const token = randomBytes(32).toString('hex');
    await db.query('DELETE FROM sessions WHERE expires_at <= now() OR token_hash = $1', [sessionHash(req)]);
    await db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [hashToken(token), user.id, new Date(Date.now() + lifetime)]);
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: lifetime })
      .status(status).json({ user, today: today() });
  }

  async function requireUser(req, res, next) {
    const { rows: [user] } = await db.query(
      `SELECT users.id, users.name, users.email FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = $1 AND sessions.expires_at > now()`, [sessionHash(req)]);
    if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
    req.user = user;
    next();
  }

  router.post('/register', limiter, async (req, res) => {
    const { name, email, password } = req.body ?? {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanName || cleanName.length > 80 || cleanName.includes('\0')) {
      return res.status(400).json({ error: 'Enter a name with 1–80 characters.' });
    }
    if (cleanEmail.length > 254 || !/^[^\s@\x00]+@[^\s@\x00]+\.[^\s@\x00]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'Use a password of at least 8 characters and at most 72 bytes.' });
    }
    const passwordHash = await bcrypt.hash(password, passwordCost);
    const { rows: [user] } = await db.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING RETURNING id, name, email`,
      [cleanName, cleanEmail, passwordHash]);
    if (!user) return res.status(409).json({ error: 'An account already uses this email.' });
    await startSession(req, res, user, 201);
  });

  router.post('/login', limiter, async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || !email.trim() || email.length > 254 || email.includes('\0') ||
        typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'Enter a valid email and password.' });
    }
    const { rows: [record] } = await db.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const matches = await bcrypt.compare(password, record?.password_hash ?? await fallbackHash);
    if (!matches || !record) return res.status(401).json({ error: invalidLogin });
    const { id, name } = record;
    await startSession(req, res, { id, name, email: record.email }, 200);
  });

  router.get('/me', requireUser, (req, res) => res.json({ user: req.user, today: today() }));
  router.delete('/session', async (req, res) => {
    await db.query('DELETE FROM sessions WHERE token_hash = $1', [sessionHash(req)]);
    res.clearCookie(cookieName, cookieOptions).status(204).end();
  });

  return { router, requireUser };
}
