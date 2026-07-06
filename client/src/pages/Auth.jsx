import { useState } from 'react';
import { api, setToken } from '../api';

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', salary: 150000 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body: form });
      setToken(data.token);
      onAuthed(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <span className="brand">dina<span>ri</span></span>
        <p className="empty" style={{ marginTop: 0 }}>
          Every dinar has a job: debt first, then goals.
        </p>
        <form className="stack" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label className="field">Name
                <input value={form.name} onChange={set('name')} autoComplete="name" />
              </label>
              <label className="field">Monthly salary (DA)
                <input type="number" min="0" value={form.salary} onChange={set('salary')} />
              </label>
            </>
          )}
          <label className="field">Email
            <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
          </label>
          <label className="field">Password
            <input type="password" required minLength={8} value={form.password} onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy}>
            {mode === 'login' ? 'Sign in' : 'Create my plan'}
          </button>
        </form>
        <p style={{ marginBottom: 0 }}>
          {mode === 'login' ? 'First time here? ' : 'Already have an account? '}
          <button className="switch" onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
