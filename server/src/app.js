import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { authRoutes } from './auth.js';
import { calendarToday } from './dates.js';
import { readingRoutes } from './readings.js';
import { reportRoutes } from './reports.js';

export function createApp(db, { today = calendarToday, secureCookies = false, passwordCost = 12 } = {}) {
  const app = express();
  const { router, requireUser } = authRoutes(db, today, { secureCookies, passwordCost });
  app.use(helmet(secureCookies ? {} : { strictTransportSecurity: false, contentSecurityPolicy: {
    directives: { upgradeInsecureRequests: null },
  } }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) {
      return res.status(415).json({ error: 'Send the request as JSON.' });
    }
    next();
  });
  app.use('/api', express.json({ limit: '8kb' }));
  app.use('/api/auth', router);
  app.use('/api/readings', requireUser, readingRoutes(db, today));
  app.use('/api/reports', requireUser, reportRoutes(db, today));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use(express.static(fileURLToPath(new URL('../../client/dist/', import.meta.url))));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
