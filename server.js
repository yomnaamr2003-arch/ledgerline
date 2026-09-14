const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Transactions ----------

app.get('/api/transactions', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM transactions ORDER BY entry_date DESC, id DESC')
    .all();
  res.json(rows);
});

app.post('/api/transactions', (req, res) => {
  const { type, category, amount, description, entry_date } = req.body;

  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'type must be "income" or "expense"' });
  }
  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'category is required' });
  }
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  if (!entry_date) {
    return res.status(400).json({ error: 'entry_date is required' });
  }

  const result = db
    .prepare(`
      INSERT INTO transactions (type, category, amount, description, entry_date)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(type, category.trim(), parsedAmount, (description || '').trim(), entry_date);

  const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.delete('/api/transactions/:id', (req, res) => {
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'transaction not found' });
  res.status(204).end();
});

// ---------- Goals ----------

app.get('/api/goals', (req, res) => {
  const rows = db.prepare('SELECT * FROM goals ORDER BY created_at ASC').all();
  res.json(rows);
});

app.post('/api/goals', (req, res) => {
  const { name, target_amount, saved_amount, deadline } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const target = Number(target_amount);
  if (!Number.isFinite(target) || target <= 0) {
    return res.status(400).json({ error: 'target_amount must be a positive number' });
  }
  const saved = Number(saved_amount) || 0;

  const result = db
    .prepare(`
      INSERT INTO goals (name, target_amount, saved_amount, deadline)
      VALUES (?, ?, ?, ?)
    `)
    .run(name.trim(), target, saved, deadline || null);

  const created = db.prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.patch('/api/goals/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'goal not found' });

  const savedAmount =
    req.body.saved_amount !== undefined ? Number(req.body.saved_amount) : goal.saved_amount;
  if (!Number.isFinite(savedAmount) || savedAmount < 0) {
    return res.status(400).json({ error: 'saved_amount must be a non-negative number' });
  }

  db.prepare('UPDATE goals SET saved_amount = ? WHERE id = ?').run(savedAmount, req.params.id);
  res.json(db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id));
});

app.delete('/api/goals/:id', (req, res) => {
  const result = db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'goal not found' });
  res.status(204).end();
});

// ---------- Aggregation ----------
// Server-side aggregation is the point of the exercise: spending grouped by
// category (for the category chart) and net flow grouped by month (for the
// trend chart) are both computed here, not in the browser.

app.get('/api/summary/by-category', (req, res) => {
  const rows = db
    .prepare(`
      SELECT category, SUM(amount) AS total
      FROM transactions
      WHERE type = 'expense'
      GROUP BY category
      ORDER BY total DESC
    `)
    .all();
  res.json(rows);
});

app.get('/api/summary/by-month', (req, res) => {
  const rows = db
    .prepare(`
      SELECT
        strftime('%Y-%m', entry_date) AS month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      GROUP BY month
      ORDER BY month ASC
    `)
    .all();
  res.json(rows.map((r) => ({ ...r, net: r.income - r.expense })));
});

app.get('/api/summary/overview', (req, res) => {
  const totals = db
    .prepare(`
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
    `)
    .get();
  const income = totals.income || 0;
  const expense = totals.expense || 0;
  res.json({ income, expense, balance: income - expense });
});

app.listen(PORT, () => {
  console.log(`Ledgerline running at http://localhost:${PORT}`);
});
