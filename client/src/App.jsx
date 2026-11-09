import { useCallback, useEffect, useRef, useState } from 'react';
import { SLOTS, slotLabel } from '../../shared/slots.js';
import { api } from './api.js';
import Auth from './Auth.jsx';
import ReadingDialog from './ReadingDialog.jsx';
import Reports from './Reports.jsx';
import { DatePicker } from './Pickers.jsx';
import { Avatar, Brand, ErrorText, formatDate, Icon } from './ui.jsx';

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', description: 'Log your glucose from fasting through dinner.' },
  { id: 'history', label: 'Reading history', icon: 'list', description: 'Find and manage your past glucose readings.' },
  { id: 'reports', label: 'Reports', icon: 'chart', description: 'Compare your daily and monthly glucose summaries.' },
];

function SidebarContent({ page, user, signingOut, onNavigate, onSignOut }) {
  return <>
    <nav aria-label="Main navigation">
      {pages.map((item) => <button key={item.id} type="button"
        aria-current={item.id === page.id ? 'page' : undefined} onClick={() => onNavigate(item)}>
        <Icon name={item.icon} size={19} /> {item.label}
      </button>)}
    </nav>
    <div className="account">
      <div className="profile"><Avatar user={user} />
        <div><strong>{user.name}</strong><small>Personal account</small></div>
      </div>
      <button type="button" className="sign-out" disabled={signingOut} onClick={onSignOut}>
        <Icon name="exit" size={18} /> Sign out
      </button>
    </div>
  </>;
}

function Workspace({ session, onUnauthorized }) {
  const [page, setPage] = useState(pages[0]);
  const drawer = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [today, setToday] = useState(session.today);
  const [date, setDate] = useState(session.today);
  const [readings, setReadings] = useState(null);
  const [action, setAction] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 720px)');
    function closeOnDesktop(event) {
      if (!event.matches && drawer.current.open) drawer.current.close();
    }
    mobile.addEventListener('change', closeOnDesktop);
    return () => mobile.removeEventListener('change', closeOnDesktop);
  }, []);

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
  const dayComplete = page.id === 'dashboard' && !firstOpenSlot;
  const add = (slot = firstOpenSlot?.id ?? 1) => {
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

  const navigation = <SidebarContent page={page} user={session.user} signingOut={signingOut}
    onNavigate={(item) => {
      drawer.current.close();
      setPage(item);
      setNotice('');
    }} onSignOut={() => { drawer.current.close(); signOut(); }} />;

  return <div className="workspace">
    <header className="mobile-header">
      <Brand />
      <button type="button" className="menu-button" aria-label="Open menu" aria-haspopup="dialog"
        aria-controls="workspace-menu" aria-expanded={menuOpen}
        onClick={() => { drawer.current.showModal(); setMenuOpen(true); }}>
        <Icon name="menu" size={22} />
      </button>
    </header>
    <aside className="sidebar desktop-sidebar">
      <Brand />
      {navigation}
    </aside>
    <dialog ref={drawer} className="mobile-drawer" id="workspace-menu" aria-label="Workspace menu"
      onClose={() => setMenuOpen(false)}
      onClick={(event) => { if (event.target === event.currentTarget) drawer.current.close(); }}>
      <div className="sidebar">
        <div className="drawer-header">
          <Brand />
          <button type="button" className="menu-button" aria-label="Close menu" autoFocus
            onClick={() => drawer.current.close()}><Icon name="close" size={22} /></button>
        </div>
        {navigation}
      </div>
    </dialog>
    <main className="content">
      <header className="page-header">
        <div><h1>{page.label}</h1><p className="muted">{page.description}</p></div>
        {page.id !== 'reports' && !dayComplete && <button className="button primary" disabled={!readings}
          onClick={() => add()}><Icon name="plus" size={19} /> Add reading</button>}
      </header>
      <ErrorText>{error}</ErrorText>
      {!readings && error && <button className="button secondary" onClick={() => { setError(''); setAttempt(attempt + 1); }}>Retry loading readings</button>}
      {notice && <p className="notice" role="status"><Icon name="check" size={18} /> {notice}</p>}
      {page.id !== 'history' && <div className="date-panel panel">
        <span className="picker-label">Selected date</span>
        <DatePicker label="Selected date" value={date} max={today} onChange={setDate} />
      </div>}
      {page.id === 'dashboard' && (readings ? <>
        <div className="section-heading"><h2>Daily readings</h2>
          <span className="reading-progress">
            <span className="progress-ticks" aria-hidden="true">{SLOTS.map(({ id }) =>
              <span key={id} className={daily.some((reading) => reading.slot === id) ? 'filled' : undefined} />
            )}</span>
            {daily.length} / {SLOTS.length} recorded
          </span>
        </div>
        <div className="slot-grid">{SLOTS.map((slot) => {
          const reading = daily.find((item) => item.slot === slot.id);
          return <section className="panel slot-card" key={slot.id}>
            <div className="slot-heading">
              <span className={'slot-icon slot-' + slot.id}><Icon name={slot.icon} size={20} /></span>
              <h3>{slot.label}</h3>
            </div>
            {reading ? <p className="slot-value">{reading.value} <small>mg/dl</small></p> : <p className="muted slot-empty">No reading yet</p>}
            <button className="text-button slot-action" onClick={() => reading ? open('edit', reading) : add(slot.id)}
              aria-label={`${reading ? 'Edit' : 'Add'} ${slot.label} reading`}>
              <Icon name={reading ? 'edit' : 'plus'} size={16} /> {reading ? 'Edit reading' : 'Add reading'}
            </button>
          </section>;
        })}</div>
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
      {page.id === 'reports' && <Reports key={date} date={date} history={readings} onUnauthorized={onUnauthorized} />}
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
