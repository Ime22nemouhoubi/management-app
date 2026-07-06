const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { sign } = require('../middleware/auth');

const router = express.Router();

// Default plan seeded on registration — fully editable afterwards.
async function seedDefaults(userId) {
  const in8Months = new Date();
  in8Months.setMonth(in8Months.getMonth() + 8);
  const endsOn = in8Months.toISOString().slice(0, 10);

  const cats = [
    ['Gym', 2000, null],
    ['Laser treatment', 6000, endsOn],
    ['Eating out', 10000, null],
    ['Clothes', 6000, null],
    ['Going out', 8000, null],
    ['Unplanned buffer', 5000, null],
  ];
  for (const [name, budget, ends] of cats) {
    await pool.query(
      'INSERT INTO categories (user_id, name, monthly_budget, ends_on) VALUES ($1,$2,$3,$4)',
      [userId, name, budget, ends]
    );
  }
  await pool.query(
    `INSERT INTO goals (user_id, name, type, target) VALUES
     ($1, 'New car', 'saving', 1000000),
     ($1, 'Emergency fund', 'saving', 250000),
     ($1, 'Debt', 'debt', 70000)`,
    [userId]
  );
}

router.post('/register', async (req, res) => {
  const { email, password, name, salary } = req.body || {};
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email and a password of at least 8 characters are required.' });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, name, salary) VALUES ($1,$2,$3,$4) RETURNING id, email, name, salary',
      [email.toLowerCase().trim(), hash, name || '', Number(salary) || 150000]
    );
    const user = rows[0];
    await seedDefaults(user.id);
    res.json({ token: sign(user), user });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    throw e;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [String(email || '').toLowerCase().trim()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }
  res.json({ token: sign(user), user: { id: user.id, email: user.email, name: user.name, salary: user.salary } });
});

module.exports = router;
