# Ledgerline — Personal Finance Dashboard

A personal finance dashboard for logging income and expenses, tracking savings
goals, and visualizing spending with charts backed by a persistent SQLite
database.

Built as a full-stack exercise in data aggregation, chart visualization, and
goal-tracking logic.

## Preview

A ledger-book interface: a bound "spine" for navigation, ruled paper for
content, brass and wax-seal accents for income/expense, Fraunces for display
type and IBM Plex Mono for figures and data labels.

## Tech stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript, [Chart.js](https://www.chartjs.org/)
- **Backend:** Node.js, Express.js
- **Database:** SQLite (via `better-sqlite3`)

## Features

- Log income and expense transactions with category, amount, date, and note
- Delete transactions from the ledger
- Savings goals with a target amount, amount saved, optional deadline, and a
  progress bar
- Doughnut chart of spending by category
- Line chart of income vs. expense trend by month
- All aggregation (by category, by month, running totals) computed server-side
  with SQL, not in the browser
- Seeded with three months of sample data so the dashboard is populated on
  first run

## REST API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions` | List all transactions, most recent first |
| POST | `/api/transactions` | Create a transaction (`type`, `category`, `amount`, `entry_date`, `description`) |
| DELETE | `/api/transactions/:id` | Delete a transaction |
| GET | `/api/goals` | List all savings goals |
| POST | `/api/goals` | Create a goal (`name`, `target_amount`, `saved_amount`, `deadline`) |
| PATCH | `/api/goals/:id` | Update a goal's saved amount |
| DELETE | `/api/goals/:id` | Delete a goal |
| GET | `/api/summary/overview` | Total income, expense, and balance |
| GET | `/api/summary/by-category` | Expense totals grouped by category |
| GET | `/api/summary/by-month` | Income, expense, and net totals grouped by month |

## Data model

```
transactions
  id, type ('income' | 'expense'), category, amount,
  description, entry_date, created_at

goals
  id, name, target_amount, saved_amount, deadline, created_at
```

## Running locally

```bash
npm install
npm start
```

The dashboard is served at `http://localhost:3000`. The SQLite database file
(`ledgerline.db`) is created automatically on first run and seeded with
sample transactions and goals.

## Project structure

```
ledgerline/
├── server.js        # Express app + REST API + aggregation queries
├── db.js            # SQLite schema + seed data
├── package.json
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

## Notes on the aggregation logic

- **By category:** `SUM(amount)` grouped by `category`, filtered to
  `type = 'expense'`, feeds the doughnut chart directly.
- **By month:** transactions are grouped by `strftime('%Y-%m', entry_date)`,
  with income and expense summed separately in the same query so the trend
  chart can plot both series (and their difference, `net`) per month.
- **Goal progress:** `saved_amount / target_amount`, clamped to 100% on the
  frontend so an over-funded goal still renders a full bar.
