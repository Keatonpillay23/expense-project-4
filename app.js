/* ============================================================
   PROJECT 4: EXPENSE TRACKER — app.js
   New concepts: reduce() for totals, grouping data, and drawing
   a chart with Chart.js. Everything else builds on Projects 2–3.
   Section numbers match NOTES.md.
   ============================================================ */

/* ------------------------------------------------------------
   1. CONFIG
   ------------------------------------------------------------ */
const STORAGE_KEY = 'keaton-expenses-v1';

/* One object per category: icon for the list, colour for the chart.
   Keeping display concerns here means the rest of the code just asks
   "what's the icon for Food?" instead of hard-coding emoji everywhere. */
const CATEGORIES = {
  Food:          { icon: '🍽️', color: '#e8590c' },
  Transport:     { icon: '🚌', color: '#1c7ed6' },
  Rent:          { icon: '🏠', color: '#7048e8' },
  Utilities:     { icon: '💡', color: '#f59f00' },
  Shopping:      { icon: '🛍️', color: '#e64980' },
  Entertainment: { icon: '🎬', color: '#12b886' },
  Salary:        { icon: '💰', color: '#2f9e44' },
  Other:         { icon: '📦', color: '#868e96' },
};

function categoryInfo(name) {
  return CATEGORIES[name] || CATEGORIES.Other;
}

/* ------------------------------------------------------------
   2. STATE
   ------------------------------------------------------------ */
let transactions = loadTransactions();
let currentFilter = 'all';      // 'all' | 'income' | 'expense'
let chart = null;               // holds the Chart.js instance
let idSeed = Date.now();        // unique ids (see Project 2 notes)

function makeId() {
  return idSeed++;
}

/* ------------------------------------------------------------
   3. DOM
   ------------------------------------------------------------ */
const form        = document.getElementById('txForm');
const descInput   = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput   = document.getElementById('type');
const catInput    = document.getElementById('category');
const formError   = document.getElementById('formError');
const txList      = document.getElementById('txList');
const emptyState  = document.getElementById('emptyState');
const chartCanvas = document.getElementById('expenseChart');
const chartFallback = document.getElementById('chartFallback');
const filterBtns  = document.querySelectorAll('.filter-btn');
const resetBtn    = document.getElementById('resetBtn');

/* ------------------------------------------------------------
   4. PERSISTENCE
   ------------------------------------------------------------ */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn('Could not read saved transactions.', error);
  }
  return seedData();     // first visit: a few examples so it's not empty
}

/* Sample transactions so the app (and your screenshot) looks alive
   on first load. Click "Reset" to clear everything. */
function seedData() {
  return [
    { id: 1, description: 'Salary',        amount: 15000, type: 'income',  category: 'Salary',        date: '2026-11-01' },
    { id: 2, description: 'Groceries',     amount: 850,   type: 'expense', category: 'Food',          date: '2026-11-03' },
    { id: 3, description: 'Taxi fare',     amount: 420,   type: 'expense', category: 'Transport',     date: '2026-11-05' },
    { id: 4, description: 'Electricity',   amount: 1200,  type: 'expense', category: 'Utilities',     date: '2026-11-07' },
    { id: 5, description: 'Cinema',        amount: 180,   type: 'expense', category: 'Entertainment', date: '2026-11-09' },
  ];
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

/* ------------------------------------------------------------
   5. HELPERS
   ------------------------------------------------------------ */

/* Intl.NumberFormat formats money the right way per locale.
   "en-ZA" + "ZAR" → R1 850,00 (space as thousands separator, comma decimal).
   Never hand-roll currency formatting with .toFixed() and string concat —
   it breaks the moment you deal with another currency. */
const zar = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
});

function formatMoney(value) {
  return zar.format(value);
}

/* Same XSS defence as Project 2 — user text goes into innerHTML,
   so it must be escaped first. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function todayISO() {
  // toISOString() is UTC; for a local YYYY-MM-DD we adjust for the offset.
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------
   6. AGGREGATION — this is where reduce() earns its keep
   ------------------------------------------------------------
   reduce() walks an array and accumulates a single value.
     array.reduce((accumulator, item) => nextAccumulator, startingValue)
   ------------------------------------------------------------ */
function getSummary() {
  return transactions.reduce((totals, tx) => {
    if (tx.type === 'income') {
      totals.income += tx.amount;
    } else {
      totals.expense += tx.amount;
    }
    totals.balance = totals.income - totals.expense;
    return totals;
  }, { income: 0, expense: 0, balance: 0 });
}

/* Grouping with reduce: turn a LIST into a TOTALS-PER-CATEGORY object.
   This is the single most useful reduce pattern you'll ever learn. */
function getExpenseByCategory() {
  return transactions
    .filter(tx => tx.type === 'expense')            // ignore income
    .reduce((totals, tx) => {
      totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
      return totals;
    }, {});
}

/* ------------------------------------------------------------
   7. ACTIONS
   ------------------------------------------------------------ */
function addTransaction({ description, amount, type, category }) {
  transactions.unshift({
    id: makeId(),
    description: description.trim(),
    amount: Number(amount),
    type,
    category,
    date: todayISO(),
  });
  saveTransactions();
  render();
}

function deleteTransaction(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  saveTransactions();
  render();
}

function resetAll() {
  if (!confirm('Delete all transactions? This cannot be undone.')) return;
  transactions = [];
  saveTransactions();
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  render();
}

/* ------------------------------------------------------------
   8. RENDER
   ------------------------------------------------------------ */
function getVisibleTransactions() {
  if (currentFilter === 'income')  return transactions.filter(tx => tx.type === 'income');
  if (currentFilter === 'expense') return transactions.filter(tx => tx.type === 'expense');
  return transactions;
}

function render() {
  renderSummary();
  renderList();
  renderChart();
}

function renderSummary() {
  const { income, expense, balance } = getSummary();

  document.getElementById('totalIncome').textContent = formatMoney(income);
  document.getElementById('totalExpense').textContent = formatMoney(expense);

  const balanceEl = document.getElementById('balance');
  balanceEl.textContent = formatMoney(balance);
  // In the red? Say so visually, not just numerically.
  balanceEl.classList.toggle('negative', balance < 0);
}

function renderList() {
  const visible = getVisibleTransactions();

  txList.innerHTML = visible.map(tx => {
    const info = categoryInfo(tx.category);
    const sign = tx.type === 'income' ? '+' : '−';

    return `
      <li class="tx-item" data-id="${tx.id}">
        <div class="tx-cat" aria-hidden="true">${info.icon}</div>
        <div class="tx-info">
          <div class="tx-desc">${escapeHtml(tx.description)}</div>
          <div class="tx-meta">${escapeHtml(tx.category)} • ${formatDate(tx.date)}</div>
        </div>
        <div class="tx-amount ${tx.type}">${sign}${formatMoney(tx.amount)}</div>
        <button class="btn-delete" data-id="${tx.id}" aria-label="Delete transaction">✕</button>
      </li>`;
  }).join('');

  emptyState.classList.toggle('hidden', visible.length > 0);

  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === currentFilter);
  });
}

/* ------------------------------------------------------------
   9. THE CHART
   ------------------------------------------------------------
   Two real-world lessons here:
   1. The CDN script might not load (offline, blocked, ad-blocker).
      If `Chart` is undefined we show a fallback instead of throwing.
   2. Chart.js needs to be UPDATED, not re-created, or you leak memory
      and get flickering. `chart.data = ...; chart.update()`.
   ------------------------------------------------------------ */
function renderChart() {
  const byCategory = getExpenseByCategory();
  const labels = Object.keys(byCategory);
  const values = labels.map(label => byCategory[label]);

  // No expenses, or Chart.js didn't load → show the fallback message
  const chartAvailable = typeof Chart !== 'undefined';
  if (labels.length === 0 || !chartAvailable) {
    chartFallback.classList.remove('hidden');
    chartCanvas.style.display = 'none';
    if (chart) { chart.destroy(); chart = null; }
    if (!chartAvailable && labels.length > 0) {
      chartFallback.textContent = 'Chart library could not load — check your connection.';
    } else if (labels.length === 0) {
      chartFallback.textContent = 'No expenses to show yet.';
    }
    return;
  }

  chartFallback.classList.add('hidden');
  chartCanvas.style.display = 'block';

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: labels.map(label => categoryInfo(label).color),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  if (chart) {
    // Update the existing chart in place
    chart.data = data;
    chart.update();
  } else {
    chart = new Chart(chartCanvas, {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              // Show rands in the tooltip, not bare numbers
              label: (context) => ` ${context.label}: ${formatMoney(context.parsed)}`,
            },
          },
        },
      },
    });
  }
}

/* ------------------------------------------------------------
   10. EVENTS
   ------------------------------------------------------------ */
form.addEventListener('submit', event => {
  event.preventDefault();
  formError.textContent = '';

  const description = descInput.value.trim();
  const amount = amountInput.value;

  // Validate before touching state — never trust the form
  if (!description) {
    formError.textContent = 'Please add a description.';
    descInput.focus();
    return;
  }
  if (!amount || Number(amount) <= 0 || Number.isNaN(Number(amount))) {
    formError.textContent = 'Please enter an amount greater than 0.';
    amountInput.focus();
    return;
  }

  addTransaction({
    description,
    amount: Math.round(Number(amount) * 100) / 100,   // kill float drift
    type: typeInput.value,
    category: catInput.value,
  });

  form.reset();
  descInput.focus();
});

/* Event delegation again: one listener for every delete button,
   including ones that don't exist yet. */
txList.addEventListener('click', event => {
  if (event.target.classList.contains('btn-delete')) {
    deleteTransaction(Number(event.target.dataset.id));
  }
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

resetBtn.addEventListener('click', resetAll);

/* ------------------------------------------------------------
   11. STARTUP
   ------------------------------------------------------------ */
render();

// Debug helper: inspect totals in the console
window.showTotals = () => ({ ...getSummary(), byCategory: getExpenseByCategory() });
