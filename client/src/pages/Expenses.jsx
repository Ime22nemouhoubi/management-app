import { useEffect, useState } from 'react';
import { api, fmt } from '../api';

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function Expenses() {
  const [month, setMonth] = useState(thisMonth());
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = m => api(`/expenses?month=${m}`).then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(month); }, [month]);

  async function remove(id) {
    await api(`/expenses/${id}`, { method: 'DELETE' });
    load(month);
  }

  const total = items.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="card">
      <div className="inline" style={{ alignItems: 'baseline' }}>
        <h2>Expenses</h2>
        <label className="field" style={{ maxWidth: 180 }}>Month
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {items.length === 0 && <p className="empty">Nothing logged for this month yet. Add expenses from the dashboard.</p>}
      {items.map(e => (
        <div className="exp" key={e.id}>
          <div>
            <div>{e.label}</div>
            <div className="meta">{e.spent_at.slice(0, 10)} · {e.category_name || 'Unplanned'}</div>
          </div>
          <span className="amt">{fmt(e.amount)}</span>
          <button className="btn ghost" onClick={() => remove(e.id)}>Delete</button>
        </div>
      ))}
      {items.length > 0 && (
        <div className="exp"><strong>Total</strong><span className="amt"><strong>{fmt(total)}</strong></span><span /></div>
      )}
    </div>
  );
}
