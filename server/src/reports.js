import { Router } from 'express';
import { isCalendarDate } from './dates.js';

const periods = {
  daily: ['$2::date', '$2::date'],
  'month-to-date': ['month_start', '$2::date'],
  'previous-month': ["(month_start - interval '1 month')::date", 'month_start - 1'],
};

export function reportRoutes(db, today) {
  const router = Router();

  router.get('/:period', async (req, res) => {
    const { period } = req.params;
    const { date } = req.query;
    if (!Object.hasOwn(periods, period)) return res.status(404).json({ error: 'Report not found.' });
    if (!isCalendarDate(date)) return res.status(400).json({ error: 'Choose a valid report date.' });
    if (date > today()) return res.status(400).json({ error: 'Date cannot be in the future.' });
    const [start, end] = periods[period];
    const daily = period === 'daily';
    const dailyDetails = daily ? `,
      COALESCE(json_agg(json_build_object('slot', time_slot, 'value', glucose_value)
        ORDER BY time_slot) FILTER (WHERE readings.id IS NOT NULL), '[]'::json) AS readings` : '';
    const { rows: [report] } = await db.query(
      `WITH selected AS (SELECT date_trunc('month', $2::date::timestamp)::date AS month_start),
       period AS (SELECT ${start} AS start_date, ${end} AS end_date FROM selected)
       SELECT start_date::text AS "startDate", end_date::text AS "endDate",
         MIN(glucose_value) AS lowest, MAX(glucose_value) AS highest,
         ROUND(AVG(glucose_value), 1)::float8 AS average,
         COUNT(readings.id)::integer AS count${dailyDetails}
       FROM period LEFT JOIN readings ON readings.user_id = $1
         AND readings.reading_date BETWEEN start_date AND end_date
       GROUP BY start_date, end_date`, [req.user.id, date]);
    res.json({ report });
  });

  return router;
}
