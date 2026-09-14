const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'ledgerline.db'));

db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    description TEXT,
    entry_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL CHECK(target_amount > 0),
    saved_amount REAL NOT NULL DEFAULT 0,
    deadline TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed with a few starter entries only if the ledger is empty, so a fresh
// clone still demonstrates the charts and progress bars immediately.
const seedCount = db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;
if (seedCount === 0) {
  const insertTxn = db.prepare(`
    INSERT INTO transactions (type, category, amount, description, entry_date)
    VALUES (?, ?, ?, ?, ?)
  `);
  const seedTxns = [
    ['income', 'Salary', 8500, 'Monthly salary', '2026-07-01'],
    ['expense', 'Rent', 2800, 'July rent', '2026-07-02'],
    ['expense', 'Groceries', 640, 'Supermarket run', '2026-07-05'],
    ['expense', 'Transport', 310, 'Fuel + tolls', '2026-07-09'],
    ['expense', 'Dining', 420, 'Weekend out', '2026-07-14'],
    ['income', 'Freelance', 1200, 'French lesson batch', '2026-07-18'],
    ['expense', 'Utilities', 380, 'Electricity + internet', '2026-07-20'],
    ['income', 'Salary', 8500, 'Monthly salary', '2026-08-01'],
    ['expense', 'Rent', 2800, 'August rent', '2026-08-02'],
    ['expense', 'Groceries', 705, 'Supermarket run', '2026-08-06'],
    ['expense', 'Dining', 260, 'Coffee + lunches', '2026-08-11'],
    ['expense', 'Transport', 295, 'Fuel + tolls', '2026-08-15'],
    ['income', 'Freelance', 900, 'French lesson batch', '2026-08-19'],
    ['expense', 'Entertainment', 500, 'Cinema + streaming', '2026-08-22'],
    ['income', 'Salary', 8500, 'Monthly salary', '2026-09-01'],
    ['expense', 'Rent', 2800, 'September rent', '2026-09-02'],
    ['expense', 'Groceries', 590, 'Supermarket run', '2026-09-05'],
    ['expense', 'Utilities', 410, 'Electricity + internet', '2026-09-08'],
    ['expense', 'Transport', 330, 'Fuel + tolls', '2026-09-11'],
    ['income', 'Freelance', 1500, 'French lesson batch', '2026-09-13']
  ];
  for (const row of seedTxns) insertTxn.run(...row);

  const insertGoal = db.prepare(`
    INSERT INTO goals (name, target_amount, saved_amount, deadline)
    VALUES (?, ?, ?, ?)
  `);
  const seedGoals = [
    ['Emergency Fund', 20000, 8400, '2026-12-31'],
    ['New Laptop', 45000, 12000, '2027-02-28'],
    ['Alexandria–Paris Trip', 60000, 6200, '2027-06-30']
  ];
  for (const row of seedGoals) insertGoal.run(...row);
}

module.exports = db;
