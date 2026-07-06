const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = require('../middleware/safeRouter')();
router.use(requireAuth);

// ---------- profile ----------
router.get('/me', async (req, res) => {
  const { rows } = await pool.query('SELECT id, email, name, salary FROM users WHERE id = $1', [req.user.id]);
  res.json(rows[0]);
});

router.put('/me', async (req, res) => {
  const { name, salary } = req.body || {};
  const { rows } = await pool.query(
    'UPDATE users SET name = COALESCE($1, name), salary = COALESCE($2, salary) WHERE id = $3 RETURNING id, email, name, salary',
    [name ?? null, salary != null ? Number(salary) : null, req.user.id]
  );
  res.json(rows[0]);
});

// ---------- categories ----------
router.get('/categories', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categories WHERE user_id = $1 ORDER BY monthly_budget DESC', [req.user.id]);
  res.json(rows);
});

router.post('/categories', async (req, res) => {
  const { name, monthly_budget, ends_on } = req.body || {};
  if (!name) return res.status(400).json({ error: 'A category needs a name.' });
  const { rows } = await pool.query(
    'INSERT INTO categories (user_id, name, monthly_budget, ends_on) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.user.id, name, Number(monthly_budget) || 0, ends_on || null]
  );
  res.json(rows[0]);
});

router.put('/categories/:id', async (req, res) => {
  const { name, monthly_budget, ends_on } = req.body || {};
  const { rows } = await pool.query(
    `UPDATE categories SET name = COALESCE($1, name), monthly_budget = COALESCE($2, monthly_budget), ends_on = $3
     WHERE id = $4 AND user_id = $5 RETURNING *`,
    [name ?? null, monthly_budget != null ? Number(monthly_budget) : null, ends_on || null, req.params.id, req.user.id]
  );
  res.json(rows[0]);
});

router.delete('/categories/:id', async (req, res) => {
  await pool.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ---------- expenses ----------
router.get('/expenses', async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const { rows } = await pool.query(
    `SELECT e.*, c.name AS category_name FROM expenses e
     LEFT JOIN categories c ON c.id = e.category_id
     WHERE e.user_id = $1 AND to_char(e.spent_at, 'YYYY-MM') = $2
     ORDER BY e.spent_at DESC, e.id DESC`,
    [req.user.id, month]
  );
  res.json(rows);
});

router.post('/expenses', async (req, res) => {
  const { label, amount, category_id, spent_at } = req.body || {};
  if (!label || !(Number(amount) >= 0)) return res.status(400).json({ error: 'An expense needs a label and an amount.' });
  const { rows } = await pool.query(
    'INSERT INTO expenses (user_id, category_id, label, amount, spent_at) VALUES ($1,$2,$3,$4, COALESCE($5, CURRENT_DATE)) RETURNING *',
    [req.user.id, category_id || null, label, Number(amount), spent_at || null]
  );
  res.json(rows[0]);
});

router.delete('/expenses/:id', async (req, res) => {
  await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ---------- goals & contributions ----------
router.get('/goals', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, COALESCE(SUM(c.amount), 0)::int AS saved
     FROM goals g LEFT JOIN contributions c ON c.goal_id = g.id
     WHERE g.user_id = $1 GROUP BY g.id ORDER BY g.type DESC, g.target DESC`,
    [req.user.id]
  );
  res.json(rows);
});

router.post('/goals', async (req, res) => {
  const { name, type, target } = req.body || {};
  if (!name || !['saving', 'debt'].includes(type) || !(Number(target) > 0)) {
    return res.status(400).json({ error: 'A goal needs a name, a type, and a target above zero.' });
  }
  const { rows } = await pool.query(
    'INSERT INTO goals (user_id, name, type, target) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.user.id, name, type, Number(target)]
  );
  res.json({ ...rows[0], saved: 0 });
});

router.post('/goals/:id/contributions', async (req, res) => {
  const { amount, made_at } = req.body || {};
  if (!(Number(amount) > 0)) return res.status(400).json({ error: 'The amount must be above zero.' });
  const { rows } = await pool.query(
    `INSERT INTO contributions (user_id, goal_id, amount, made_at)
     SELECT $1, id, $2, COALESCE($3, CURRENT_DATE) FROM goals WHERE id = $4 AND user_id = $1
     RETURNING *`,
    [req.user.id, Number(amount), made_at || null, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/goals/:id', async (req, res) => {
  await pool.query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ---------- monthly summary ----------
router.get('/summary', async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;

  const [{ rows: userRows }, { rows: catRows }, { rows: spentRows }, { rows: contribRows }, { rows: goalRows }] =
    await Promise.all([
      pool.query('SELECT salary FROM users WHERE id = $1', [req.user.id]),
      pool.query(
        `SELECT * FROM categories WHERE user_id = $1 AND (ends_on IS NULL OR ends_on >= $2::date)`,
        [req.user.id, monthStart]
      ),
      pool.query(
        `SELECT category_id, COALESCE(SUM(amount),0)::int AS spent FROM expenses
         WHERE user_id = $1 AND to_char(spent_at, 'YYYY-MM') = $2 GROUP BY category_id`,
        [req.user.id, month]
      ),
      pool.query(
        `SELECT g.type, COALESCE(SUM(c.amount),0)::int AS total FROM contributions c
         JOIN goals g ON g.id = c.goal_id
         WHERE c.user_id = $1 AND to_char(c.made_at, 'YYYY-MM') = $2 GROUP BY g.type`,
        [req.user.id, month]
      ),
      pool.query(
        `SELECT g.*, COALESCE(SUM(c.amount),0)::int AS saved FROM goals g
         LEFT JOIN contributions c ON c.goal_id = g.id
         WHERE g.user_id = $1 GROUP BY g.id`,
        [req.user.id]
      ),
    ]);

  const salary = userRows[0]?.salary || 0;
  const spentByCat = Object.fromEntries(spentRows.map(r => [r.category_id ?? 'none', r.spent]));

  const categories = catRows.map(c => ({
    ...c,
    spent: spentByCat[c.id] || 0,
    remaining: c.monthly_budget - (spentByCat[c.id] || 0),
  }));
  const uncategorizedSpent = spentByCat['none'] || 0;

  const totalBudget = categories.reduce((s, c) => s + c.monthly_budget, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spent, 0) + uncategorizedSpent;
  const debtPaid = contribRows.find(r => r.type === 'debt')?.total || 0;
  const savedThisMonth = contribRows.find(r => r.type === 'saving')?.total || 0;

  const debtRemaining = goalRows
    .filter(g => g.type === 'debt')
    .reduce((s, g) => s + Math.max(0, g.target - g.saved), 0);

  const leftover = salary - totalSpent - debtPaid - savedThisMonth;

  // Safe to spend today: remaining budget spread over remaining days of the month.
  const now = new Date();
  const isCurrentMonth = month === now.toISOString().slice(0, 7);
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate() + 1) : daysInMonth;
  const budgetRemaining = Math.max(0, totalBudget - (totalSpent - uncategorizedSpent) - uncategorizedSpent);
  const safeToSpendToday = Math.floor(budgetRemaining / daysLeft);

  // Projection: leftover after budgets is what feeds debt, then goals.
  const monthlyFree = Math.max(0, salary - totalBudget);
  const carGoal = goalRows.find(g => g.type === 'saving' && /car|voiture/i.test(g.name)) ||
    goalRows.filter(g => g.type === 'saving').sort((a, b) => b.target - a.target)[0];
  let projection = null;
  if (monthlyFree > 0) {
    const monthsToDebtFree = debtRemaining > 0 ? Math.ceil(debtRemaining / monthlyFree) : 0;
    let monthsToCar = null;
    if (carGoal) {
      const carRemaining = Math.max(0, carGoal.target - carGoal.saved);
      monthsToCar = monthsToDebtFree + Math.ceil(carRemaining / monthlyFree);
    }
    projection = { monthlyFree, monthsToDebtFree, monthsToCar, carGoalName: carGoal?.name || null };
  }

  res.json({
    month, salary, categories, uncategorizedSpent,
    totalBudget, totalSpent, debtPaid, savedThisMonth, debtRemaining,
    leftover, safeToSpendToday, daysLeft, projection,
    goals: goalRows,
  });
});

module.exports = router;
