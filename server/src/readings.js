import { Router } from 'express';
import { slotLabel } from '../../shared/slots.js';
import { isCalendarDate } from './dates.js';

const fields = 'id, reading_date::text AS date, time_slot AS slot, glucose_value AS value';

function validateReading(body, today) {
  const { date, slot, value } = body ?? {};
  if (value == null || (typeof value === 'string' && !value.trim())) return 'Please enter a glucose value.';
  if (!Number.isInteger(value)) return 'Glucose value must be a whole number.';
  if (value < 40 || value > 600) return 'Value must be between 40 and 600 mg/dl.';
  if (!isCalendarDate(date)) return 'Choose a valid reading date.';
  if (date > today) return 'Date cannot be in the future.';
  if (!slotLabel(slot)) return 'Choose one of the four daily time slots.';
  return null;
}

export function readingRoutes(db, today) {
  const router = Router();

  router.get('/', async (req, res) => {
    const { rows } = await db.query(
      `SELECT ${fields} FROM readings WHERE user_id = $1 ORDER BY reading_date DESC, time_slot`, [req.user.id]);
    res.json({ readings: rows, today: today() });
  });

  router.param('id', (req, res, next, id) => {
    if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647) {
      return res.status(400).json({ error: 'Invalid reading ID.' });
    }
    next();
  });

  function saveReading(isUpdate) {
    return async (req, res) => {
      const error = validateReading(req.body, today());
      if (error) return res.status(400).json({ error });
      const { date, slot, value } = req.body;
      const params = [req.user.id, date, slot, value];
      const sql = isUpdate
        ? `UPDATE readings SET reading_date = $2, time_slot = $3, glucose_value = $4, updated_at = now()
           WHERE user_id = $1 AND id = $5 RETURNING ${fields}`
        : `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
           VALUES ($1, $2, $3, $4) RETURNING ${fields}`;
      if (isUpdate) params.push(req.params.id);
      try {
        const { rows: [reading] } = await db.query(sql, params);
        if (!reading) return res.status(404).json({ error: 'Reading not found.' });
        res.status(isUpdate ? 200 : 201).json({ reading });
      } catch (err) {
        if (err.constraint !== 'readings_unique_slot') throw err;
        res.status(409).json({ error: `You already have a reading for ${slotLabel(slot)} on this date.` });
      }
    };
  }

  router.post('/', saveReading(false));
  router.put('/:id', saveReading(true));
  router.delete('/:id', async (req, res) => {
    const { rowCount } = await db.query('DELETE FROM readings WHERE user_id = $1 AND id = $2',
      [req.user.id, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Reading not found.' });
    res.status(204).end();
  });

  return router;
}
