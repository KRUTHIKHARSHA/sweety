<p align="center">
  <img src="./client/src/assets/sweety-mark.svg" width="72" height="72" alt="Sweety logo">
</p>
<h1 align="center">Sweety</h1>
<p align="center"><strong>Personal blood glucose tracker</strong></p>
<p align="center">A take-home project for Kenpath Technologies.</p>
<p align="center">
  <a href="#screenshots">Screenshots</a> ·
  <a href="#run-locally">Run locally</a> ·
  <a href="#4-run-tests">Run tests</a> ·
  <a href="#api">API</a>
</p>

[![Sweety dashboard with four daily glucose readings](./screenshots/02-dashboard.png)](./screenshots/02-dashboard.png)

## Features

| Area | What you can do |
| --- | --- |
| Daily dashboard | Pick a date and log fasting, after-breakfast, after-lunch, and after-dinner readings. |
| Reading history | Review past entries and edit or delete individual readings. |
| Reports | Compare daily, month-to-date, and previous-month summaries. Explore daily averages in the monthly trend chart. |
| Private accounts | Register and sign in to manage your own readings. The interface adapts to desktop and mobile. |

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, JavaScript, HTML, CSS, and Vite |
| API | Node.js and Express |
| Data and authentication | PostgreSQL, node-postgres, bcrypt, and server-side sessions |
| Integration tests | Node.js test runner and Supertest against PostgreSQL |

## Run locally

Use Node.js 24 LTS with npm, and a running PostgreSQL server. Run all npm commands from the repository root. If PowerShell blocks the npm script shim, run `npm.cmd` in place of `npm`.

### 1. Create the PostgreSQL databases

Connect as a PostgreSQL administrator using `psql -U postgres -d postgres` or pgAdmin. Run these statements with autocommit enabled. Substitute a local password of your choice.

```sql
CREATE ROLE sweety LOGIN PASSWORD 'local-password';
CREATE DATABASE sweety OWNER sweety;
CREATE DATABASE sweety_test OWNER sweety;
```

### 2. Configure and prepare the app

Copy `.env.example` to `.env` with `Copy-Item .env.example .env` in PowerShell or `cp .env.example .env` on macOS and Linux. Set the database URLs to match your PostgreSQL user, password, host, and port. Percent-encode any special characters in the password portion of a URL.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Required for the app, schema setup, and demo seed |
| `TEST_DATABASE_URL` | Required for integration tests. Use a dedicated test database |
| `PORT` | API port, defaults to `3000` |
| `HOST` | API bind address, defaults to `127.0.0.1` |
| `APP_TIME_ZONE` | Calendar timezone, defaults to `Asia/Kolkata` |
| `NODE_ENV` | Set to `production` for Secure cookies when serving the app through HTTPS |

```sh
npm ci
npm run db:setup
npm run db:seed
```

Seeding is optional. It creates a fictional user and records for today, earlier in the current month when available, and the previous month. Rerunning it fills missing demo slots and preserves existing values.

| Demo credential | Value |
| --- | --- |
| Email | `demo@sweety.example` |
| Password | `SweetyDemo2026!` |

### 3. Start the app

Run `npm run dev:server` in one terminal and `npm run dev:client` in another. Open [the Vite development app](http://127.0.0.1:5173). Vite forwards `/api` to Express on `PORT`.

To run a single server, use `npm run build` followed by `npm start`. Express serves the built client and API together at [the default local address](http://127.0.0.1:3000).

### 4. Run tests

```sh
npm test
```

The suite applies the real schema in a randomly named schema inside the test database, then removes that schema. It checks registration, login and logout, access control, validation, concurrent duplicate requests, updates, deletion, all three report windows, and empty reports.

## How it works

- **Authentication.** bcrypt hashes each password. Express generates a random session token and sends it as an HttpOnly, SameSite=Strict cookie. PostgreSQL stores only a SHA-256 digest of the token. Sessions expire after seven days and logout revokes the session. Server-side sessions make revocation immediate and keep authentication details out of React state and browser storage.
- **Ownership.** Express resolves the user from the session and passes that ID into every reading and report query. Updates and deletes match the reading ID and the owner ID in the same SQL statement. An unknown ID and another account's ID both return 404.
- **Four readings per day.** PostgreSQL restricts slots to four fixed values and makes `(user_id, reading_date, time_slot)` unique. The unique constraint also handles simultaneous submissions. Express turns a conflict into a message naming the occupied slot.
- **Reports.** PostgreSQL aggregates each inclusive date range and rounds the average to one decimal. The daily query returns its readings in slot order alongside the statistics. Empty reports return a count of zero and null statistics. The monthly chart uses the signed-in user's reading history to plot a daily average for the month shown in the date picker. Days without readings appear as gaps.

## API

| Method and path | Purpose |
| --- | --- |
| `POST /api/auth/register` | Create an account and start a session |
| `POST /api/auth/login` | Start a session |
| `GET /api/auth/me` | Get the current user and today's date |
| `DELETE /api/auth/session` | Sign out and revoke the session |
| `GET /api/readings` | List the signed-in user's readings |
| `POST /api/readings` | Add a reading |
| `PUT /api/readings/:id` | Update a reading |
| `DELETE /api/readings/:id` | Remove a reading |
| `GET /api/reports/daily?date=YYYY-MM-DD` | Get a day's statistics and slots |
| `GET /api/reports/month-to-date?date=YYYY-MM-DD` | Get statistics from the first day of the month through the selected date |
| `GET /api/reports/previous-month?date=YYYY-MM-DD` | Get statistics for the preceding calendar month |

Create and update accept JSON such as `{"date":"2026-10-15","slot":1,"value":105}`. Slots 1 through 4 are Morning (fasting), After breakfast, After lunch, and After dinner. Values are whole numbers from 40 through 600 mg/dl.

## Assumptions and future work

- Dates represent calendar days in one configurable application timezone. Readings use mg/dl.
- The history loads in one request, which suits the assessment dataset. Pagination and server-side chart aggregation would help as histories grow.
- A multi-instance deployment would benefit from shared rate limits and automatic expired-session cleanup. The current server uses an in-memory authentication rate limit and cleans expired sessions during sign-in.

## Screenshots

The screenshots use fictional demo data. Select an image to view it full size.

<table>
  <tr>
    <th>Sign-in</th>
    <th>Reading history</th>
  </tr>
  <tr>
    <td><a href="./screenshots/01-sign-in.png"><img src="./screenshots/01-sign-in.png" width="420" alt="Sweety sign-in form beside a glucose meter photograph"></a></td>
    <td><a href="./screenshots/03-reading-history.png"><img src="./screenshots/03-reading-history.png" width="420" alt="Reading history with dates, time slots, values, and edit and delete actions"></a></td>
  </tr>
  <tr>
    <th>Reports and monthly trend</th>
    <th>Mobile reports</th>
  </tr>
  <tr>
    <td valign="top"><a href="./screenshots/04-reports.png"><img src="./screenshots/04-reports.png" width="420" alt="Daily, month-to-date, and previous-month reports above a line chart"></a></td>
    <td valign="top" align="center"><a href="./screenshots/05-mobile-reports.png"><img src="./screenshots/05-mobile-reports.png" width="180" alt="Sweety reports stacked vertically on a phone"></a></td>
  </tr>
</table>

### Demo walkthrough

Sign in with the fictional account and review the four dashboard slots. Open Reading history to edit a value, then open Reports and change the date to compare the three reporting periods. Register a fresh fictional account to see the empty dashboard and add, edit, and delete a reading.
