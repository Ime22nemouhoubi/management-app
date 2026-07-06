import { useEffect, useState } from 'react';
import { api, fmt } from '../api';

export default function Budget() {
  const [me, setMe] = useState(null);
  const [cats, setCats] = useState([]);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ name: '', monthly_budget: '', ends_on: '' });

  const load = () => Promise.all([api('/me'), api('/categories')])
    .then(([m, c]) => { setMe(m); setCats(c); })
    .catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  async function saveSalary(e) {
    e.preventDefault();
    const updated = await api('/me', { method: 'PUT', body: { salary: Number(me.salary) } });
    setMe(updated);
  }

  async function addCat(e) {
    e.preventDefault();
    await api('/categories', { method: 'POST', body: { ...draft, ends_on: draft.ends_on || null } });
    setDraft({ name: '', monthly_budget: '', ends_on: '' });
    load();
  }

  async function updateCat(c) {
    await api(`/categories/${c.id}`, {
      method: 'PUT',
      body: { name: c.name, monthly_budget: Number(c.monthly_budget), ends_on: c.ends_on ? c.ends_on.slice(0, 10) : null },
    });
    load();
  }

  async function removeCat(id) {
    await api(`/categories/${id}`, { method: 'DELETE' });
    load();
  }

  if (!me) return <p className="empty">Loading…</p>;
  const totalBudget = cats.reduce((s, c) => s + Number(c.monthly_budget || 0), 0);
  const free = me.salary - totalBudget;

  return (
    <>
      <div className="card">
        <h2>Salary</h2>
        {error && <p className="error">{error}</p>}
        <form className="inline" onSubmit={saveSalary} style={{ marginTop: 10 }}>
          <label className="field">Monthly salary (DA)
            <input type="number" min="0" value={me.salary} onChange={e => setMe(m => ({ ...m, salary: e.target.value }))} />
          </label>
          <button className="btn small">Save salary</button>
        </form>
        <p className="eta">
          Budgets total {fmt(totalBudget)} · {free >= 0
            ? `${fmt(free)} free each month for debt and goals`
            : `${fmt(-free)} over your salary — trim a category`}
        </p>
      </div>

      <div className="card">
        <h2>Monthly budgets</h2>
        {cats.map(c => (
          <div className="goal" key={c.id}>
            <div className="inline">
              <label className="field">Name
                <input value={c.name} onChange={e => setCats(cs => cs.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} />
              </label>
              <label className="field">Budget (DA)
                <input type="number" min="0" value={c.monthly_budget} onChange={e => setCats(cs => cs.map(x => x.id === c.id ? { ...x, monthly_budget: e.target.value } : x))} />
              </label>
              <label className="field">Ends on (optional)
                <input type="date" value={c.ends_on ? c.ends_on.slice(0, 10) : ''} onChange={e => setCats(cs => cs.map(x => x.id === c.id ? { ...x, ends_on: e.target.value } : x))} />
              </label>
              <button className="btn small" onClick={() => updateCat(c)} type="button">Save</button>
              <button className="btn ghost" onClick={() => removeCat(c.id)} type="button">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>New category</h2>
        <form className="inline" onSubmit={addCat} style={{ marginTop: 10 }}>
          <label className="field">Name
            <input required value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Transport, phone…" />
          </label>
          <label className="field">Budget (DA)
            <input required type="number" min="0" value={draft.monthly_budget} onChange={e => setDraft(d => ({ ...d, monthly_budget: e.target.value }))} />
          </label>
          <label className="field">Ends on (optional)
            <input type="date" value={draft.ends_on} onChange={e => setDraft(d => ({ ...d, ends_on: e.target.value }))} />
          </label>
          <button className="btn small">Add</button>
        </form>
      </div>
    </>
  );
}
