import { useEffect, useState } from 'react';
import { slotLabel } from '../../shared/slots.js';
import { api } from './api.js';
import { ErrorText, formatDate } from './ui.jsx';
import MonthlyTrend from './MonthlyTrend.jsx';

const periods = [
  ['daily', 'Daily report'],
  ['month-to-date', 'Month to date'],
  ['previous-month', 'Previous month'],
];

function ReportCard({ title, report }) {
  const { startDate, endDate, highest, lowest, average, count } = report;
  return <section className="panel report-card">
    <header className="report-heading">
      <h2>{title}</h2>
      <p className="muted">{formatDate(startDate)}{startDate !== endDate && ' – ' + formatDate(endDate)}</p>
    </header>
    {count === 0
      ? <p className="report-empty">No readings in this period.</p>
      : <dl className="metrics">
        {[['Highest', highest, 'mg/dl'], ['Lowest', lowest, 'mg/dl'], ['Average', average.toFixed(1), 'mg/dl'],
          ['Readings', count, 'total']].map(([label, value, unit]) =>
          <div key={label}><dt>{label}</dt><dd>{value} <small>{unit}</small></dd></div>)}
      </dl>}
  </section>;
}

export default function Reports({ date, history, onUnauthorized }) {
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(periods.map(([period]) => api(`/reports/${period}?date=${date}`, { signal: controller.signal })))
      .then(setResults)
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err.status === 401) onUnauthorized();
        else setError(err.message);
      });
    return () => controller.abort();
  }, [date, attempt, onUnauthorized]);

  if (error) return <><ErrorText>{error}</ErrorText><button className="button secondary" onClick={() => {
    setError('');
    setAttempt(attempt + 1);
  }}>Try again</button></>;
  if (!results) return <p role="status" className="muted">Loading reports…</p>;
  const { readings } = results[0].report;
  return <>
    <div className="reports-grid">{results.map(({ report }, index) =>
      <ReportCard key={periods[index][0]} title={periods[index][1]} report={report} />)}</div>
    {history && <MonthlyTrend date={date} readings={history} />}
    {readings.length > 0 && <section className="panel report-card">
      <h2>Daily breakdown</h2>
      <ul className="report-readings">{readings.map(({ slot, value }) =>
        <li key={slot}><span>{slotLabel(slot)}</span><strong>{value} <small>mg/dl</small></strong></li>)}</ul>
    </section>}
  </>;
}
