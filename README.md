# Dinari — salary manager

Personal salary and budget manager for the Algerian market. Every dinar has a job:
debt first, then goals. Node/Express + PostgreSQL backend, React 18 + Vite frontend.

## Features

- Auth (email + password, JWT) — your data stays private
- Monthly budgets per category, with optional end dates (e.g. a laser treatment
  that runs for 8 months then disappears from the plan)
- Expense logging, including unplanned expenses with no category
- "Safe to spend today" — remaining budget spread over the days left this month
- Goals (car, emergency fund…) and debts, with contributions/payments and
  a projection: debt-free in N months, car in M months at your current free cash
- Odometer-style counter on the car fund
- DZD formatting everywhere, mobile-first UI

## Run locally

Requirements: Node 18+, a PostgreSQL database.

```bash
# 1. backend deps
npm install

# 2. frontend deps
cd client && npm install && cd ..

# 3. environment (Git Bash)
export DATABASE_URL="postgresql://user:pass@localhost:5432/dinari"
export JWT_SECRET="pick-a-long-random-string"

# 4. run both (two terminals)
npm run dev:server   # API on :3000, creates tables automatically
npm run dev:client   # Vite on :5173, proxies /api to :3000
```

Open http://localhost:5173, create an account — it seeds the example plan
(gym, laser with an 8-month end date, eating out, clothes, going out, buffer,
plus the car goal, emergency fund, and 70,000 DA debt). Everything is editable.

## Deploy to Railway

1. Push this repo to GitHub, create a Railway project from it.
2. Add a **PostgreSQL** database to the project.
3. On the app service, set the variables (Service → Variables):
   - `DATABASE_URL` → use the reference `${{Postgres.DATABASE_URL}}`
     (this is the one that bit us on study-arcade — don't skip it)
   - `JWT_SECRET` → a long random string
4. Railway runs `npm install`, `npm run build` (builds the React client),
   then `npm start`. The Express server serves both the API and the built
   frontend, so one service is enough.
5. Tables are created automatically on first boot — no manual migration step.

## Stack

- **Server**: Express, `pg`, bcryptjs, jsonwebtoken
- **Client**: React 18, Vite, react-router, hand-rolled CSS design system
- **DB**: PostgreSQL (users, categories, expenses, goals, contributions)
