import { useState } from 'react';
import { api } from './api.js';
import { Brand, ErrorText } from './ui.jsx';

export default function Auth({ onAuth }) {
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="auth-intro">
      <Brand />
      <div className="intro-copy">
        <p className="intro-title">Your daily glucose log.</p>
        <p>Record readings from fasting through dinner and see how they change over time.</p>
      </div>
    </div>
    <section className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-form">
        <h1 id="auth-title">{register ? 'Create your account' : 'Sign in to Sweety'}</h1>
        <p className="muted">{register ? 'Create an account to log your first reading.' : 'Open your glucose log and reports.'}</p>
        <form onSubmit={submit}>
          {register && <label>Name<input name="name" autoComplete="name" required maxLength={80} /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <div className="password-field">
            <label htmlFor="auth-password">Password</label>
            <div className="password-input">
              <input key={String(register)} id="auth-password" name="password" type={showPassword ? 'text' : 'password'}
                autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined}
                aria-describedby={register ? 'password-hint' : undefined} required />
              <button className="text-button" type="button" aria-controls="auth-password"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
            {register && <p id="password-hint" className="muted">Use at least 8 characters.</p>}
          </div>
          <ErrorText>{error}</ErrorText>
          <button className="button primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="switch-auth">{register ? 'Already have an account?' : 'New to Sweety?'}{' '}
          <button type="button" className="text-button" disabled={busy} onClick={() => {
            setRegister(!register);
            setShowPassword(false);
            setError('');
          }}>{register ? 'Sign in' : 'Create an account'}</button>
        </p>
      </div>
    </section>
  </main>;
}
