import { formatDate } from './ui.jsx';

const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function dailyAverages(month, readings) {
  const totals = new Map();
  for (const reading of readings) {
    if (reading.date.slice(0, 7) !== month) continue;
    const daily = totals.get(reading.date) ?? { sum: 0, count: 0 };
    daily.sum += reading.value;
    daily.count += 1;
    totals.set(reading.date, daily);
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([date, { sum, count }]) => ({
    date, count, day: Number(date.slice(-2)), average: Number((sum / count).toFixed(1)),
  }));
}

function TrendPlot({ points, daysInMonth, monthLabel }) {
  const values = points.map(({ average }) => average);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const step = Math.max(10, Math.ceil((maximum - minimum) / 30) * 10);
  const lower = Math.floor(minimum / step) * step;
  const x = (day) => 44 + (day - 1) * 372 / (daysInMonth - 1);
  const y = (value) => 151 - (value - lower) * 33 / step;
  const path = points.map(({ day, average }, index) => {
    const command = points[index - 1]?.day === day - 1 ? 'L' : 'M';
    return `${command} ${x(day)} ${y(average)}`;
  }).join(' ');

  return <svg className="trend-plot" viewBox="0 0 440 182" role="img"
    aria-label={`Daily average glucose in mg/dl for ${monthLabel}. Days without readings are blank.`}>
    {Array.from({ length: 5 }, (_, index) => lower + step * index).map((value) =>
      <g key={value}>
        <line className="trend-guide" x1="44" x2="416" y1={y(value)} y2={y(value)} />
        <text x="35" y={y(value)} dy=".35em" textAnchor="end">{value}</text>
      </g>)}
    {[1, 7, 14, 21, daysInMonth].map((day) =>
      <text key={day} x={x(day)} y="173" textAnchor="middle">{day}</text>)}
    <path className="trend-line" d={path} />
    {points.map(({ date, day, average }) =>
      <circle className="trend-point" key={date} cx={x(day)} cy={y(average)} r="3.5">
        <title>{formatDate(date)} · {average.toFixed(1)} mg/dl</title>
      </circle>)}
  </svg>;
}

export default function MonthlyTrend({ date, readings }) {
  const month = date.slice(0, 7);
  const firstDay = new Date(month + '-01T00:00:00Z');
  const monthLabel = monthFormat.format(firstDay);
  const lastDay = new Date(firstDay);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
  const points = dailyAverages(month, readings);

  return <section className="panel report-card monthly-trend" aria-labelledby="monthly-trend-title">
    <h2 id="monthly-trend-title">Monthly glucose trend</h2>
    <p className="muted">{monthLabel} · Daily average (mg/dl)</p>
    {points.length === 0 ? <p className="report-empty">No readings to chart for this month.</p> : <>
      <TrendPlot points={points} daysInMonth={lastDay.getUTCDate()} monthLabel={monthLabel} />
      <p className="muted trend-note">Gaps show days without readings.</p>
      <details className="trend-data">
        <summary>View daily averages</summary>
        <table>
          <thead><tr><th>Date</th><th>Average (mg/dl)</th><th>Readings</th></tr></thead>
          <tbody>{points.map(({ date: day, average, count }) =>
            <tr key={day}><td>{formatDate(day)}</td><td>{average.toFixed(1)}</td><td>{count}</td></tr>)}</tbody>
        </table>
      </details>
    </>}
  </section>;
}
