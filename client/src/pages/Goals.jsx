import { useEffect, useState } from 'react';
import { api, fmt } from '../api';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [sum, setSum] = useState(null);
  const [error, setError] = useState('');
  const [amounts, setAmounts] = useState({});
  const [draft, setDraft] = useState({ name: '', type: 'saving', target: '' });

  const load = () => Promise.all([api('/goals'), api('/summary')])
    .then(([g, s]) => { setGoals(g); setSum(s); })
    .catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  async function contribute(id) {
    const amount = Number(amounts[id]);
    if (!(amount > 0)) return;
    await api(`/goals/${id}/contributions`, { method: 'POST', body: { amount } });
    setAmounts(a => ({ ...a, [id]: '' }));
    load();
  }

  async function addGoal(e) {
    e.preventDefault();
    await api('/goals', { method: 'POST', body: draft });
    setDraft({ name: '', type: 'saving', target: '' });
    load();
  }

  async function removeGoal(id) {
    await api(`/goals/${id}`, { method: 'DELETE' });
    load();
  }

  const monthlyFree = sum?.projection?.monthlyFree || 0;

  return (
    <>
      <div className="card">
        <h2>Goals & debts</h2>
        {error && <p className="error">{error}</p>}
        {goals.map(g => {
          const remaining = Math.max(0, g.target - g.saved);
          const pct = Math.min(100, (g.saved / g.target) * 100);
          const eta = monthlyFree > 0 && remaining > 0 ? Math.ceil(remaining / monthlyFree) : null;
          return (
            <div className="goal" key={g.id}>
              <div className="top">
                <span><strong>{g.name}</strong> <span className={`pill ${g.type}`}>{g.type === 'debt' ? 'Debt' : 'Saving'}</span></span>
                <span className="nums amount">{fmt(g.saved)} / {fmt(g.target)}</span>
              </div>
              <div className="bar"><i className={g.type === 'debt' ? 'warn' : ''} style={{ width: `${pct}%` }} /></div>
              <p className="eta">
                {remaining === 0
                  ? (g.type === 'debt' ? 'Paid off. Well done.' : 'Goal reached. Well done.')
                  : `${fmt(remaining)} to go${eta ? ` · ~${eta} month${eta > 1 ? 's' : ''} at ${fmt(monthlyFree)}/month` : ''}`}
              </p>
              <div className="inline">
                <label className="field">{g.type === 'debt' ? 'Record a payment (DA)' : 'Add to this goal (DA)'}
                  <input type="number" min="1" value={amounts[g.id] || ''} onChange={e => setAmounts(a => ({ ...a, [g.id]: e.target.value }))} />
                </label>
                <button className="btn small" onClick={() => contribute(g.id)}>{g.type === 'debt' ? 'Pay' : 'Save'}</button>
                <button className="btn ghost" onClick={() => removeGoal(g.id)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2>New goal or debt</h2>
        <form className="stack" onSubmit={addGoal} style={{ marginTop: 10 }}>
          <div className="inline">
            <label className="field">Name
              <input required value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Trip, laptop…" />
            </label>
            <label className="field">Type
              <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}>
                <option value="saving">Saving</option>
                <option value="debt">Debt</option>
              </select>
            </label>
            <label className="field">Target (DA)
              <input required type="number" min="1" value={draft.target} onChange={e => setDraft(d => ({ ...d, target: e.target.value }))} />
            </label>
          </div>
          <button className="btn">Add goal</button>
        </form>
      </div>
    </>
  );
}
