import { useCallback, useEffect, useState } from 'react';
import { SLOTS, slotLabel } from '../../shared/slots.js';
import { api } from './api.js';
import Auth from './Auth.jsx';
import ReadingDialog from './ReadingDialog.jsx';
import Reports from './Reports.jsx';
import { Brand, ErrorText, formatDate, Icon } from './ui.jsx';

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', title: 'Dashboard', description: 'Log and review your glucose readings for the selected day.' },
  { id: 'history', label: 'Reading history', icon: 'list', title: 'Reading history', description: 'View, edit, and manage all your recorded glucose readings.' },
  { id: 'reports', label: 'Reports', icon: 'chart', title: 'Reports', description: 'Review your daily, month-to-date, and previous-month summaries.' },
];

function Workspace({ session, onUnauthorized }) {
  const [page, setPage] = useState(pages[0]);
  const [today, setToday] = useState(session.today);
  const [date, setDate] = useState(session.today);
  const [readings, setReadings] = useState(null);
  const [action, setAction] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api('/readings', { signal: controller.signal }).then((result) => {
      setReadings(result.readings);
      setToday(result.today);
    }).catch((err) => {
      if (controller.signal.aborted) return;
      if (err.status === 401) onUnauthorized();
      else setError(err.message);
    });
    return () => controller.abort();
  }, [attempt, onUnauthorized]);

  const daily = (readings ?? []).filter((reading) => reading.date === date);
  const firstOpenSlot = SLOTS.find(({ id }) => !daily.some((reading) => reading.slot === id));
  const add = (slot = firstOpenSlot?.id) => {
    setNotice('');
    setAction({ kind: 'add', reading: { date, slot } });
  };
  const open = (kind, reading) => {
    setNotice('');
    setAction({ kind, reading });
  };

  async function save(body) {
    const { kind, reading } = action;
    const method = { add: 'POST', edit: 'PUT', delete: 'DELETE' }[kind];
    try {
      const result = await api('/readings' + (reading.id ? '/' + reading.id : ''), { method, body });
      setReadings((current) => {
        const updated = current.filter((item) => item.id !== reading.id);
        if (result) updated.push(result.reading);
        return updated.sort((a, b) => b.date.localeCompare(a.date) || a.slot - b.slot);
      });
      if (result) setDate(result.reading.date);
      setNotice({ add: 'Reading added.', edit: 'Reading updated.', delete: 'Reading deleted.' }[kind]);
      setAction(null);
    } catch (err) {
      if (err.status === 401) onUnauthorized();
      throw err;
    }
  }

  async function signOut() {
    setSigningOut(true);
    setError('');
    try {
      await api('/auth/session', { method: 'DELETE' });
      onUnauthorized();
    } catch (err) {
      setError(err.message);
      setSigningOut(false);
    }
  }

  return <div className="workspace">
    <aside className="sidebar">
      <Brand />
      <nav aria-label="Main navigation">
        <span className="nav-heading">WORKSPACE</span>
        {pages.map((item) => <button key={item.id} type="button"
          aria-current={item.id === page.id ? 'page' : undefined} onClick={() => { setPage(item); setNotice(''); }}>
          <Icon name={item.icon} size={19} /> {item.label}
        </button>)}
      </nav>
      <div className="account">
        <div className="profile"><span className="avatar">{Array.from(session.user.name)[0].toUpperCase()}</span>
          <div><strong>{session.user.name}</strong><small>Personal account</small></div>
        </div>
        <button type="button" className="sign-out" disabled={signingOut} onClick={signOut}><Icon name="exit" size={18} /> Sign out</button>
      </div>
    </aside>
    <main className="content">
      <header className="page-header">
        <div><span className="eyebrow">BLOOD GLUCOSE TRACKER</span><h1>{page.title}</h1><p className="muted">{page.description}</p></div>
        {page.id !== 'reports' && <button className="button primary" disabled={!readings || !firstOpenSlot}
          onClick={() => add()}><Icon name="plus" size={19} /> Add reading</button>}
      </header>
      <ErrorText>{error}</ErrorText>
      {!readings && error && <button className="button secondary" onClick={() => { setError(''); setAttempt(attempt + 1); }}>Retry loading readings</button>}
      {notice && <p className="notice" role="status"><Icon name="check" size={18} /> {notice}</p>}
      {page.id !== 'history' && <div className="date-panel panel">
        <span className="date-icon"><Icon name="calendar" /></span>
        <label htmlFor="selected-date">Selected date<small>Choose a day to review</small></label>
        <input id="selected-date" type="date" value={date} max={today} onChange={(event) => {
          if (event.target.validity.valid && event.target.value) setDate(event.target.value);
        }} />
      </div>}
      {page.id === 'dashboard' && (readings ? <>
        <div className="section-heading"><div><h2>Daily readings</h2><p className="muted">{formatDate(date)}</p></div>
          <span className="badge">{daily.length} / 4 recorded</span></div>
        <div className="slot-grid">{SLOTS.map((slot) => {
          const reading = daily.find((item) => item.slot === slot.id);
          return <section className="panel slot-card" key={slot.id}>
            <span className={'slot-icon slot-' + slot.id}><Icon name={slot.icon} size={22} /></span>
            <h3>{slot.label}</h3>
            {reading ? <p className="slot-value">{reading.value} <small>mg/dl</small></p> : <p className="muted slot-empty">No reading yet</p>}
            <button className="text-button slot-action" onClick={() => reading ? open('edit', reading) : add(slot.id)}
              aria-label={`${reading ? 'Edit' : 'Add'} ${slot.label} reading`}>
              <Icon name={reading ? 'edit' : 'plus'} size={16} /> {reading ? 'Edit reading' : 'Add reading'}
            </button>
          </section>;
        })}</div>
        <div className="info-note"><Icon name="drop" size={19} /> Each day has four slots. You can save one glucose reading in each slot.</div>
      </> : !error && <p role="status" className="muted">Loading readings…</p>)}
      {page.id === 'history' && (readings ? <section className="panel history">
        {readings.length ? <div className="table-scroll"><table>
          <caption className="sr-only">Your glucose reading history</caption>
          <thead><tr><th>Date</th><th>Time slot</th><th>Glucose</th><th>Actions</th></tr></thead>
          <tbody>{readings.map((reading) => <tr key={reading.id}>
            <td>{formatDate(reading.date)}</td><td>{slotLabel(reading.slot)}</td>
            <td><strong>{reading.value}</strong> <small>mg/dl</small></td>
            <td><div className="row-actions">
              <button className="icon-button" onClick={() => open('edit', reading)}
                aria-label={`Edit ${slotLabel(reading.slot)} reading on ${formatDate(reading.date)}`}><Icon name="edit" size={18} /></button>
              <button className="icon-button delete" onClick={() => open('delete', reading)}
                aria-label={`Delete ${slotLabel(reading.slot)} reading on ${formatDate(reading.date)}`}><Icon name="trash" size={18} /></button>
            </div></td>
          </tr>)}</tbody>
        </table></div> : <div className="empty-state"><Icon name="list" size={28} /><h2>No readings yet</h2><p className="muted">Add your first reading to start your history.</p></div>}
      </section> : !error && <p role="status" className="muted">Loading readings…</p>)}
      {page.id === 'reports' && <Reports key={date} date={date} onUnauthorized={onUnauthorized} />}
    </main>
    {action && <ReadingDialog action={action} today={today} onClose={() => setAction(null)} onSave={save} />}
  </div>;
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const onUnauthorized = useCallback(() => setSession(null), []);

  useEffect(() => {
    const controller = new AbortController();
    api('/auth/me', { signal: controller.signal }).then(setSession).catch((err) => {
      if (controller.signal.aborted) return;
      if (err.status === 401) setSession(null);
      else setError(err.message);
    });
    return () => controller.abort();
  }, [attempt]);

  if (error) return <main className="startup"><ErrorText>{error}</ErrorText><button className="button secondary"
    onClick={() => { setError(''); setAttempt(attempt + 1); }}>Try again</button></main>;
  if (session === undefined) return <main className="startup"><p role="status">Loading Sweety…</p></main>;
  return session ? <Workspace session={session} onUnauthorized={onUnauthorized} /> : <Auth onAuth={setSession} />;
}
