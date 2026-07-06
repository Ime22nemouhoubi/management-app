import { useEffect, useState } from 'react';
import { api, fmt } from '../api';
import Odometer from '../components/Odometer';

export default function Dashboard() {
  const [sum, setSum] = useState(null);
  const [error, setError] = useState('');
  const [quick, setQuick] = useState({ label: '', amount: '', category_id: '' });
  const [busy, setBusy] = useState(false);

  const load = () => api('/summary').then(setSum).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  async function addQuick(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/expenses', { method: 'POST', body: { ...quick, category_id: quick.category_id || null } });
      setQuick({ label: '', amount: '', category_id: '' });
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (error) return <p className="error">{error}</p>;
  if (!sum) return <p className="empty">Loading your month…</p>;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthPct = (now.getDate() / daysInMonth) * 100;
  const car = sum.goals.find(g => sum.projection?.carGoalName === g.name) ||
    sum.goals.filter(g => g.type === 'saving').sort((a, b) => b.target - a.target)[0];

  return (
    <>
      <div className="card hero">
        <div className="eyebrow">Safe to spend today</div>
        <div className="big">{new Intl.NumberFormat('fr-DZ').format(sum.safeToSpendToday)}<small>DA</small></div>
        <div className="sub">
          {fmt(Math.max(0, sum.totalBudget - sum.totalSpent))} of budget left · {sum.daysLeft} day{sum.daysLeft > 1 ? 's' : ''} to go
        </div>
        <div className="runway" aria-label={`${Math.round(monthPct)}% of the month elapsed`}>
          <i style={{ width: `${monthPct}%` }} />
        </div>
      </div>

      {car && (
        <div className="card">
          <div className="eyebrow">{car.name}</div>
          <Odometer value={car.saved} />
          <p className="eta">
            {fmt(car.saved)} of {fmt(car.target)}
            {sum.projection?.monthsToCar != null && sum.debtRemaining > 0 &&
              ` · debt-free in ~${sum.projection.monthsToDebtFree} month${sum.projection.monthsToDebtFree > 1 ? 's' : ''}, car in ~${sum.projection.monthsToCar}`}
            {sum.projection?.monthsToCar != null && sum.debtRemaining === 0 &&
              ` · at ${fmt(sum.projection.monthlyFree)}/month, reached in ~${sum.projection.monthsToCar} month${sum.projection.monthsToCar > 1 ? 's' : ''}`}
          </p>
        </div>
      )}

      <div className="grid2">
        <div className="card">
          <h2>Add an expense</h2>
          <form className="stack" onSubmit={addQuick} style={{ marginTop: 10 }}>
            <div className="inline">
              <label className="field">What
                <input required value={quick.label} onChange={e => setQuick(q => ({ ...q, label: e.target.value }))} placeholder="Lunch, taxi…" />
              </label>
              <label className="field">Amount (DA)
                <input required type="number" min="0" value={quick.amount} onChange={e => setQuick(q => ({ ...q, amount: e.target.value }))} />
              </label>
            </div>
            <label className="field">Category
              <select value={quick.category_id} onChange={e => setQuick(q => ({ ...q, category_id: e.target.value }))}>
                <option value="">Unplanned</option>
                {sum.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <button className="btn" disabled={busy}>Save expense</button>
          </form>
        </div>

        <div className="card">
          <h2>This month by category</h2>
          {sum.categories.map(c => {
            const pct = c.monthly_budget ? Math.min(100, (c.spent / c.monthly_budget) * 100) : 0;
            const cls = c.spent > c.monthly_budget ? 'over' : pct > 80 ? 'warn' : '';
            return (
              <div className="cat" key={c.id}>
                <div className="row">
                  <span className="name">{c.name} {c.ends_on && <span className="ends">ends {c.ends_on.slice(0, 7)}</span>}</span>
                  <span className="nums">{fmt(c.spent)} / {fmt(c.monthly_budget)}</span>
                </div>
                <div className="bar"><i className={cls} style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          {sum.uncategorizedSpent > 0 && (
            <div className="cat">
              <div className="row">
                <span className="name">Unplanned</span>
                <span className="nums">{fmt(sum.uncategorizedSpent)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Month at a glance</h2>
        <div className="cat"><div className="row"><span>Salary</span><span className="nums">{fmt(sum.salary)}</span></div></div>
        <div className="cat"><div className="row"><span>Spent</span><span className="nums">−{fmt(sum.totalSpent)}</span></div></div>
        <div className="cat"><div className="row"><span>Debt paid</span><span className="nums">−{fmt(sum.debtPaid)}</span></div></div>
        <div className="cat"><div className="row"><span>Put into goals</span><span className="nums">−{fmt(sum.savedThisMonth)}</span></div></div>
        <div className="cat"><div className="row"><span><strong>Left over</strong></span><span className="nums"><strong>{fmt(sum.leftover)}</strong></span></div></div>
        {sum.debtRemaining > 0 && (
          <p className="eta">Remaining debt: {fmt(sum.debtRemaining)} — pay this before feeding the goals.</p>
        )}
      </div>
    </>
  );
}
