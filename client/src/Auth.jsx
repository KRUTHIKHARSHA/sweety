import { useState } from 'react';
import { api } from './api.js';
import { Brand, ErrorText, Icon } from './ui.jsx';

export default function Auth({ onAuth }) {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      onAuth(await api('/auth/' + (register ? 'register' : 'login'), { method: 'POST', body }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-layout">
    <section className="auth-intro">
      <Brand />
      <div className="intro-copy">
        <span className="eyebrow">YOUR PERSONAL GLUCOSE LOG</span>
        <h1>A clearer view of your glucose.</h1>
        <p>Log readings across four daily time slots and review your patterns over time.</p>
        <ul>{['Four slots from fasting to after dinner', 'Daily and monthly summaries', 'Private, account-based tracking'].map((item) =>
          <li key={item}><Icon name="check" size={17} /> {item}</li>)}</ul>
      </div>
    </section>
    <section className="auth-panel">
      <div className="auth-form">
        <span className="eyebrow">{register ? 'GET STARTED' : 'WELCOME BACK'}</span>
        <h2>{register ? 'Create your account' : 'Sign in to Sweety'}</h2>
        <p className="muted">{register ? 'Start building your personal glucose log.' : 'Access your readings and reports.'}</p>
        <form onSubmit={submit}>
          {register && <label>Name<input name="name" autoComplete="name" required maxLength={80} /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label>Password<input key={String(register)} name="password" type="password"
            autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} required /></label>
          <ErrorText>{error}</ErrorText>
          <button className="button primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="switch-auth">{register ? 'Already have an account?' : 'New to Sweety?'}{' '}
          <button type="button" className="text-button" disabled={busy} onClick={() => {
            setRegister(!register);
            setError('');
          }}>{register ? 'Sign in' : 'Create an account'}</button>
        </p>
      </div>
    </section>
  </main>;
}
