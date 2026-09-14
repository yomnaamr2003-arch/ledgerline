const money = (n) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n);

const dateLabel = (isoDate) =>
  new Date(isoDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const monthLabel = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// ---------- Navigation ----------

const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    views.forEach((v) => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`view-${tab.dataset.view}`).classList.add('active');
  });
});

// ---------- Overview ----------

let categoryChart, trendChart;

async function loadOverview() {
  const [overview, byCategory, byMonth] = await Promise.all([
    fetch('/api/summary/overview').then((r) => r.json()),
    fetch('/api/summary/by-category').then((r) => r.json()),
    fetch('/api/summary/by-month').then((r) => r.json())
  ]);

  document.getElementById('tally-income').textContent = money(overview.income);
  document.getElementById('tally-expense').textContent = money(overview.expense);
  document.getElementById('tally-balance').textContent = money(overview.balance);

  renderCategoryChart(byCategory);
  renderTrendChart(byMonth);
}

function renderCategoryChart(rows) {
  const ctx = document.getElementById('chart-category');
  const palette = ['#a13d2b', '#a9803e', '#3e7856', '#5c9976', '#c96852', '#cfa860', '#7a6a4f', '#8d5b3d'];

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: rows.map((r) => r.category),
      datasets: [{
        data: rows.map((r) => r.total),
        backgroundColor: rows.map((_, i) => palette[i % palette.length]),
        borderColor: '#f2ecdc',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { family: 'IBM Plex Mono', size: 11 }, color: '#262a22', boxWidth: 12 }
        },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.label}: ${money(ctx.parsed)}` }
        }
      }
    }
  });
}

function renderTrendChart(rows) {
  const ctx = document.getElementById('chart-trend');

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rows.map((r) => monthLabel(r.month)),
      datasets: [
        {
          label: 'Income',
          data: rows.map((r) => r.income),
          borderColor: '#3e7856',
          backgroundColor: 'rgba(62, 120, 86, 0.12)',
          tension: 0.25,
          fill: true
        },
        {
          label: 'Expense',
          data: rows.map((r) => r.expense),
          borderColor: '#a13d2b',
          backgroundColor: 'rgba(161, 61, 43, 0.1)',
          tension: 0.25,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { font: { family: 'IBM Plex Mono', size: 11 } }, grid: { color: '#d9cba3' } },
        y: { ticks: { font: { family: 'IBM Plex Mono', size: 11 } }, grid: { color: '#d9cba3' } }
      },
      plugins: {
        legend: { labels: { font: { family: 'IBM Plex Mono', size: 11 }, color: '#262a22' } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${money(ctx.parsed.y)}` } }
      }
    }
  });
}

// ---------- Transactions ----------

const ledgerBody = document.getElementById('ledger-body');
const entryForm = document.getElementById('entry-form');

async function loadTransactions() {
  const rows = await fetch('/api/transactions').then((r) => r.json());
  ledgerBody.innerHTML = '';

  if (rows.length === 0) {
    ledgerBody.innerHTML = '<p class="ledger-empty">No entries yet. Record the first one above.</p>';
    return;
  }

  for (const row of rows) {
    const line = document.createElement('div');
    line.className = `ledger-row ${row.type}`;
    line.setAttribute('role', 'row');
    line.innerHTML = `
      <span>${dateLabel(row.entry_date)}</span>
      <span>${escapeHtml(row.category)}</span>
      <span>${escapeHtml(row.description || '')}</span>
      <span class="num">${row.type === 'expense' ? '−' : '+'}${money(row.amount)}</span>
      <span class="col-action"><button class="row-delete" data-id="${row.id}" title="Delete entry">✕</button></span>
    `;
    ledgerBody.appendChild(line);
  }

  ledgerBody.querySelectorAll('.row-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/transactions/${btn.dataset.id}`, { method: 'DELETE' });
      await Promise.all([loadTransactions(), loadOverview()]);
    });
  });
}

entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(entryForm);
  const payload = Object.fromEntries(formData.entries());

  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    entryForm.reset();
    document.getElementById('f-date').valueAsDate = new Date();
    await Promise.all([loadTransactions(), loadOverview()]);
  } else {
    const { error } = await res.json();
    alert(error || 'Could not record that entry.');
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Goals ----------

const goalGrid = document.getElementById('goal-grid');
const goalForm = document.getElementById('goal-form');

async function loadGoals() {
  const rows = await fetch('/api/goals').then((r) => r.json());
  goalGrid.innerHTML = '';

  if (rows.length === 0) {
    goalGrid.innerHTML = '<p class="ledger-empty">No goals open yet.</p>';
    return;
  }

  for (const goal of rows) {
    const pct = Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100));
    const card = document.createElement('article');
    card.className = 'goal-card';
    card.innerHTML = `
      <h3>${escapeHtml(goal.name)}</h3>
      <div class="goal-meta">
        <span>${money(goal.saved_amount)} saved</span>
        <span>of ${money(goal.target_amount)}</span>
      </div>
      <div class="goal-bar-track">
        <div class="goal-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="goal-meta">
        <span class="goal-pct">${pct}%</span>
        <span class="goal-deadline">${goal.deadline ? 'by ' + dateLabel(goal.deadline) : 'no deadline set'}</span>
      </div>
    `;
    goalGrid.appendChild(card);
  }
}

goalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(goalForm);
  const payload = Object.fromEntries(formData.entries());

  const res = await fetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    goalForm.reset();
    await loadGoals();
  } else {
    const { error } = await res.json();
    alert(error || 'Could not open that goal.');
  }
});

// ---------- Init ----------

document.getElementById('f-date').valueAsDate = new Date();
loadOverview();
loadTransactions();
loadGoals();
