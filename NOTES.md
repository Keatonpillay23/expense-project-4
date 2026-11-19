# 📚 Project 4 Notes — Expense Tracker (reduce, money, charts)

**Why this project matters:** you already know how to store and render data. This one is about **deriving** information from it — turning a list of individual transactions into totals, balances and per-category sums. That's the same job SQL does with `SUM` and `GROUP BY`, and the same job you'll do in MongoDB aggregations in Week 7.

Sections match the numbered blocks in `app.js`.

---

## 1. What's actually new here

| Skill | Projects 1–3 | Project 4 |
|---|---|---|
| State | arrays of objects ✅ | same |
| Rendering | `map()` + `join()` ✅ | same |
| Persistence | `localStorage` ✅ | same |
| **New** | — | **`reduce()` for totals** |
| **New** | — | **grouping into an object** |
| **New** | — | **Chart.js + instance lifecycle** |
| **New** | — | **money formatting & float precision** |

Notice how much is *reused*. That's the point of the project sequence — you're adding one new capability on top of a familiar base each time, which is also how real jobs work.

---

## 2. `reduce()` — the last array method you need

`.map()` returns a new array. `.filter()` returns a shorter array. **`.reduce()` returns a single value** — a number, a string, an object, anything.

```js
array.reduce((accumulator, currentItem) => nextAccumulator, startingValue)
```

**Think of it as a snowball.** You start with an initial value, roll it through every item, and each item can add to it.

### Sum
```js
const total = [850, 420, 1200].reduce((sum, amount) => sum + amount, 0);
// 2470
```
Trace it: start `sum = 0` → `0+850=850` → `850+420=1270` → `1270+1200=2470`.

### Counting
```js
const expenseCount = transactions.reduce(
  (count, tx) => tx.type === 'expense' ? count + 1 : count,
  0
);
```

### The version in our app — one pass, three numbers
```js
function getSummary() {
  return transactions.reduce((totals, tx) => {
    if (tx.type === 'income') totals.income += tx.amount;
    else                      totals.expense += tx.amount;
    totals.balance = totals.income - totals.expense;
    return totals;
  }, { income: 0, expense: 0, balance: 0 });
}
```
The accumulator doesn't have to be a number — here it's an **object being built up**. Could we have used two separate `filter().reduce()` calls? Yes, but that's two passes over the data instead of one. For 5 transactions it's irrelevant; for 500,000 rows it's the difference between fast and slow.

> **The mistake everyone makes once:** forgetting to `return` the accumulator. Your result silently becomes `undefined` and the error is confusing. If `reduce` returns garbage, check your `return` first.

### When *not* to use reduce
If you can use `.map()`, `.filter()`, `.find()` or `.some()`, use them — they're clearer. `reduce` is for when you genuinely need to collapse data into one value. Overusing it makes code unreadable; it's a "clever" tool that beginners over-reach for.

---

## 3. The grouping pattern (memorise this one)

This is the most valuable `reduce` in existence — turning a list into totals per group:

```js
function getExpenseByCategory() {
  return transactions
    .filter(tx => tx.type === 'expense')
    .reduce((totals, tx) => {
      totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
      return totals;
    }, {});
}
```

Output:
```js
{ Food: 850, Transport: 420, Utilities: 1200, Entertainment: 180 }
```

**Two subtleties that matter:**

1. **`totals[tx.category] || 0`** — the first time you see "Food", the key doesn't exist yet, so it's `undefined`. `undefined + 850` is `NaN` (not a number), and `NaN` poisons every calculation downstream. The `|| 0` gives you a starting value.

2. **`Object.keys()`** later turns that object back into an array for the chart:
   ```js
   const labels = Object.keys(byCategory);       // ['Food', 'Transport', ...]
   const values = labels.map(l => byCategory[l]); // [850, 420, ...]
   ```

This exact pattern is `GROUP BY` in SQL and `$group` in MongoDB. Learn it once, use it forever.

---

## 4. Money is not a float (and this will bite you in a real job)

Open DevTools and type:
```js
0.1 + 0.2          // 0.30000000000000004
0.1 + 0.2 === 0.3  // false
```

Computers store floats in binary, and most decimals can't be represented exactly in binary — same reason 1/3 can't be written exactly in decimal. For money, this is a bug waiting to happen: totals drift by fractions of a cent, and reconciliation fails.

**Three levels of solution:**

1. **Round at the edges** (what this app does):
   ```js
   amount: Math.round(Number(amount) * 100) / 100
   ```
   Good enough for a tracker.

2. **Store integer cents** (what real systems do): store `185050` not `1850.50`. Add, subtract and compare as integers, divide by 100 only for display. No drift, ever.

3. **Use a decimal library** for serious financial work (`decimal.js`, `big.js`).

**Never do this:**
```js
'R' + total.toFixed(2)      // ❌ hard-codes currency and separators
```
`toFixed()` is fine for *rounding a display value*; it's not a currency formatter. Which brings us to:

### `Intl.NumberFormat`
```js
const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
zar.format(15000);    // "R 15 000,00"   ← space thousands, comma decimal
zar.format(1850.5);   // "R 1 850,50"
```
Change the locale to `de-DE` / `EUR` and you get `15.000,00 €` with zero code changes. `Intl` is built into every browser and Node — no library needed.

> Interview-worthy detail: `en-ZA` uses a **space** as the thousands separator and a **comma** for decimals, unlike `en-US`. Hard-coding `$` and `.` is a giveaway that someone has only ever built for one country.

---

## 5. Chart.js — and the lifecycle mistake everyone makes

### The basics
Chart.js draws into a `<canvas>` element. You give it labels and data:

```js
new Chart(canvasEl, {
  type: 'doughnut',                    // bar, line, pie, doughnut...
  data: {
    labels: ['Food', 'Transport'],
    datasets: [{ data: [850, 420], backgroundColor: ['#e8590c', '#1c7ed6'] }],
  },
  options: { responsive: true, maintainAspectRatio: false },
});
```

> `maintainAspectRatio: false` plus a fixed-height CSS wrapper is how you stop it from growing forever on every resize. Nearly every "my chart keeps getting taller" bug is this.

### The mistake: creating a new chart on every render
```js
function renderChart() {
  new Chart(canvas, {...});   // ❌ leaks memory, stacks instances, flickers
}
```
Every call adds another Chart instance bound to the same canvas. Do this on every keystroke and the page crawls.

**Correct — create once, then update:**
```js
let chart = null;

if (chart) {
  chart.data = newData;   // swap the data
  chart.update();         // let Chart.js animate to it
} else {
  chart = new Chart(canvas, { data: newData, ... });
}
```
And when you want to remove a chart entirely: `chart.destroy()`, then `chart = null`. Destroy also frees the canvas — without it, a re-created chart on the same canvas can throw *"Canvas is already in use"*.

### Handling a dependency that might not load
The CDN might be blocked, offline, or down. If `Chart` is undefined, `new Chart(...)` throws and takes your whole `render()` down with it — including the summary cards and the list.

```js
const chartAvailable = typeof Chart !== 'undefined';
if (!chartAvailable) {
  chartFallback.classList.remove('hidden');
  return;                                  // ← the rest of the app still works
}
```
**Rule:** any third-party script is a dependency that can fail. Feature-detect it and degrade — never let it break the core feature.

*(Try this: block `cdn.jsdelivr.net` in DevTools → Network → Block request URL, then reload. The cards and list still work, and you get the fallback message.)*

---

## 6. Form validation, done properly

```js
if (!description) { ... return; }
if (!amount || Number(amount) <= 0 || Number.isNaN(Number(amount))) { ... return; }
```

Four guards, all needed:
- **Empty description** — space-only strings count as empty after `.trim()`
- **Zero or negative** — a R-500 expense isn't a transaction, it's a typo
- **`NaN`** — `Number('abc')` is `NaN`, and `NaN <= 0` is **false**, so a naive `<= 0` check lets it through
- **`Number.isNaN`** specifically — `isNaN('abc')` coerces the string first; `Number.isNaN` is strict

Note the order: **validate before mutating state.** If you `push` first and validate second, a bad transaction is already in your array (and in `localStorage`) before you notice.

`novalidate` on the `<form>` turns off the browser's native popups so our messages are the only ones the user sees — mixing both is confusing.

> Also: `<input type="number" min="0.01" step="0.01">` gives mobile users a numeric keypad, which matters more than it sounds.

---

## 7. The date bug, again (it's worth repeating)

```js
new Date().toISOString().slice(0, 10)   // ❌ UTC — wrong day after 22:00 in SA (UTC+2)? No...
```
Actually in South Africa (UTC+2) the UTC date is *behind* local time in the evening — so from 22:00 to midnight, `toISOString()` still reports **yesterday**. A transaction added at 23:00 gets yesterday's date.

```js
const now = new Date();
const offsetMs = now.getTimezoneOffset() * 60000;
new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)   // ✅ local date
```
`getTimezoneOffset()` returns minutes to *add* to local time to reach UTC (negative east of Greenwich). Subtracting it shifts the timestamp so that slicing gives the local calendar date.

This is why `date` libraries exist. Be aware of it and you'll avoid a whole class of bugs — and again: `new Date("2026-11-20")` (date-only) parses as UTC, so always append `T00:00:00` for local.

---

## 8. Test it like a reviewer

- [ ] Loads with 5 sample transactions and a populated chart
- [ ] Add an expense → appears at top, balance and chart update
- [ ] Add income → balance goes up, chart (expenses only) doesn't change
- [ ] Submit with empty description → error message, nothing added
- [ ] Submit amount `0`, `-5`, `abc` → error each time
- [ ] Filter Income / Expenses / All → correct rows
- [ ] Delete a row → totals and chart recalculate
- [ ] Reload → everything still there
- [ ] Reset → confirm dialog, then empty state + fallback message
- [ ] Block `cdn.jsdelivr.net` in DevTools → app still works, fallback shown
- [ ] Add `<img src=x onerror=alert(1)>` as a description → shows as literal text
- [ ] Phone width → summary stacks, form goes single column

---

## 9. Interview checklist

- [ ] `reduce()` signature and what the accumulator is
- [ ] `map` vs `filter` vs `find` vs `reduce` — when to use each
- [ ] The grouping pattern (list → object of totals) and its SQL equivalent
- [ ] Why `0.1 + 0.2 !== 0.3`, and storing money as integer cents
- [ ] `Intl.NumberFormat` vs `toFixed`
- [ ] `Number.isNaN` vs `isNaN`
- [ ] Chart instance lifecycle: create once, `update()`, `destroy()`
- [ ] Feature-detecting third-party libraries
- [ ] Validating before mutating state
- [ ] UTC vs local date parsing

---

## 10. Ship it

1. New repo `expense-project-4` → Public → no README tick
2. Upload `index.html`, `style.css`, `app.js`, `README.md`, `NOTES.md`, `.gitignore`
3. Netlify → Import from Git → blank build settings → deploy
4. Rename site → **`keaton-expenses`**
5. ⚠️ **Project configuration → General → Visitor access → Project visibility → Public** → verify in **incognito**
6. Screenshot with data in it (the seeded state is perfect) → `screenshot.png` → upload
7. About → Website + topics: `javascript`, `chartjs`, `expense-tracker`, `localstorage`, `reduce`, `finance`
8. Portfolio → add **Project Card #04** (copy an existing card and change the content — remember to copy the whole `<article>` block, both opening and closing tags)
9. Tracker: Project 4 → **Deployed** ✅

**Week 2 of the plan is done at this point.** Next week the plan says React (Projects 5–8) — a genuine change of approach, where you stop writing `render()` by hand and let the framework do it. Everything you've built so far makes that jump much easier, because you already understand state-driven UI.
