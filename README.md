# Expense Tracker — Project #04

[Live Demo](https://keaton-expenses.netlify.app) | [GitHub Repo](https://github.com/Keatonpillay23/expense-project-4)

![Expense Tracker Screenshot](screenshot.png)

## What I Built
An expense tracker in vanilla JavaScript with a live doughnut chart — Project 4 of my 12-week, 24-project Full-Stack journey. Track income and expenses in rand, see your balance, and understand where your money goes by category.

## Features
- 💰 Add income and expenses with description, amount and category
- 📊 Live doughnut chart of spending by category (Chart.js)
- 🧮 Balance, total income and total expenses, updated instantly
- 🔍 Filter by All / Income / Expenses
- 🗑️ Delete individual transactions, or reset everything
- 💾 Persists in `localStorage` — survives a refresh
- 🇿🇦 Proper ZAR currency formatting via `Intl.NumberFormat`
- 🛡️ XSS-safe rendering, form validation, graceful chart fallback if the CDN fails
- 📱 Responsive layout

## Tech Stack
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chartdotjs&logoColor=white)

## Run Locally
```bash
git clone https://github.com/Keatonpillay23/expense-project-4.git
cd expense-project-4
```
Open `index.html` in your browser. No build step. (Needs an internet connection on first load for the Chart.js CDN.)

Ships with 5 sample transactions so the chart isn't empty — hit **Reset** to clear them.

## How It Works
Same state-driven pattern as Projects 2–3, with one new aggregation step:

```js
// totals: one number out of an array
transactions.reduce((totals, tx) => { ... }, { income: 0, expense: 0 });

// grouping: one object out of an array
transactions
  .filter(tx => tx.type === 'expense')
  .reduce((totals, tx) => {
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    return totals;
  }, {});
```

Those two objects feed the summary cards and the chart. Change the array → `render()` → everything redraws.

## What I Learned
- `reduce()` for totals, and the grouping pattern that turns a list into an object of sums
- `Intl.NumberFormat` for real currency formatting instead of string concatenation
- Floating-point money problems (`0.1 + 0.2 !== 0.3`) and rounding to cents
- Chart.js lifecycle: create an instance once, then mutate `chart.data` and call `update()` — don't re-create it
- Feature-detecting a CDN dependency (`typeof Chart !== 'undefined'`) so a failed script doesn't break the app
- `<select>`, `<input type="number">`, and validating form input properly
- Getting a *local* YYYY-MM-DD date (`toISOString()` is UTC and can shift the day)

## What I'd Improve Next
- Edit an existing transaction
- Date range filter (this month / last month)
- Monthly budget per category with a progress bar
- Export to CSV
- Store amounts as integer cents to eliminate float issues entirely

## Deployment
Deployed on Netlify via GitHub import. Every push to `main` redeploys automatically.
