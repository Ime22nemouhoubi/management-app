const path = require('path');
const express = require('express');
const { ensureSchema } = require('./db');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Serve the built frontend in production
const dist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(dist));
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api')) return next();
  res.sendFile(path.join(dist, 'index.html'), err => err && next());
});

// Central error handler — never leak stack traces to the client
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again.' });
});

const PORT = process.env.PORT || 3000;
ensureSchema()
  .then(() => app.listen(PORT, () => console.log(`Salary manager running on :${PORT}`)))
  .catch(err => {
    console.error('Could not prepare the database:', err);
    process.exit(1);
  });
