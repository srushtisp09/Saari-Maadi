# Phase 2B: Authority workflow

## 1. Goal of this phase

Add a staff-only workflow for reviewing pothole reports, recording each status
change, notifying the reporter, and measuring repair accountability. Citizens
can still report and upvote potholes; the Phase 2A duplicate checks, point
awards, priority sorting, and seeded-data exclusions remain in place.

## 2. Files created or changed

### Created

- `server/config/rewards.js` - the one-time fixed-report bonus amount.
- `server/config/sla.js` - the severity-based SLA limits and shared SLA helpers.
- `server/controllers/notificationController.js` and `server/routes/notifications.js`
  - list a user's notifications and mark all as read.
- `server/middleware/requireRole.js` - role-based authorization guard.
- `server/models/Notification.js` and `server/services/notifications.js`
  - persist notifications and avoid duplicate event notifications.
- `server/tests/authorityWorkflow.test.js` - isolated Jest/Supertest API tests.
- `src/components/NotificationBell.jsx` - polling unread badge and notification list.
- `src/components/RoleRoute.jsx` - client-side role gate for the staff page.
- `src/pages/AuthorityDashboard.jsx` - urgency-sorted queue and status modal.
- This document.

### Changed

- `server/models/User.js` - supports `citizen`, `authority`, and `admin`.
- `server/models/Pothole.js` - adds status history, fixed time, after-photo URL,
  and the one-time reward marker; expands lifecycle statuses.
- `server/controllers/potholeController.js` - enforces status transitions,
  appends history, awards the fixed bonus, sends status/upvote notifications,
  adds SLA data, and expands real-data accountability statistics.
- `server/scripts/seed.js` - creates development authority/admin accounts and
  prints their credentials only outside production.
- `server/app.js`, `server/routes/potholes.js` - mount and protect the workflow
  routes.
- `server/package.json` and `package-lock.json`, root `package.json` - add
  Jest/Supertest and the `npm test` command.
- `src/App.jsx`, `src/components/Home.jsx`, `src/pages/MapPage.jsx`,
  `src/pages/PotholeDetail.jsx`, `src/components/Accountability.jsx`,
  `src/components/PotholeMap.jsx`, `src/components/RecentReports.jsx`, and
  `src/index.css` - role-aware navigation, lifecycle labels, timeline,
  accountability metrics, and responsive staff/notification UI.

## 3. How it works in simple words

### Status flow

```text
reported -> verified -> in_progress -> fixed
     \          \             \
      +----------+-------------+-> rejected
```

`rejected` and `fixed` are terminal. Only an authority or admin can change a
status. The server checks the current state before changing it, so a client
cannot skip directly from `reported` to `fixed`. A note is required for
`fixed` and `rejected`; each successful transition adds a new history entry
with the old/new status, actor, note, and timestamp. Setting a report to
`fixed` also records `fixedAt` and awards the reporter a one-time 20-point
bonus.

The authority queue requests reports ordered by Phase 2A priority. Staff can
filter by status, minimum severity, and address/area. The SLA is centralized
in `server/config/sla.js`: severity 4-5 gets 3 days, severity 3 gets 7 days,
and severity 1-2 (or not assessed) gets 14 days. An open report is overdue
once it has been open longer than its limit.

The reporter gets a notification when a status changes and when the vote
count reaches 5, 10, or 25. The notification bell refreshes every 30 seconds;
marking all read is scoped to the signed-in user. Accountability aggregates
exclude `seeded: true` records and show percent fixed, average days to fix,
and the count of currently open SLA breaches.

## 4. Problems faced and how they were fixed

- MongoDB's in-memory binary startup took longer than Jest's default hook
  timeout. The tests now select the already cached MongoDB binary and allow a
  longer setup timeout, while keeping all test data isolated from Atlas.
- Mongoose 9 deprecates `new: true` for update queries. Workflow updates now
  request `returnDocument: 'after'`.
- Client-only role hiding would not protect the API. The status route also
  applies `requireAuth` and `requireRole('authority', 'admin')` on the server.
- Repeated status requests could otherwise award the repair bonus more than
  once. A report can transition to `fixed` only once, and the transition
  atomically records the reward marker before awarding the reporter.
- Seed reports must not distort public accountability. The stats aggregation
  continues to filter out seeded reports.

## 5. Interview questions this phase can answer

1. Why should authorization be enforced on the API as well as in the UI?
2. How do you enforce a state machine and prevent invalid transitions?
3. What is the difference between appending an audit history and overwriting
   the current status?
4. How can an operation such as awarding points be made idempotent?
5. How would you prevent duplicate notifications when multiple requests race?
6. How do indexes and server-side sorting help an urgency queue scale?
7. Why should demo records be excluded from public analytics?

## Development test accounts

Run `npm run seed` in a development environment to create or reset these demo
accounts. The seed command prints the credentials only when
`NODE_ENV` is not `production`.

| Role | Email | Password |
| --- | --- | --- |
| Authority | `authority-demo@sari-maadi.invalid` | `AuthorityDemo-2026!` |
| Admin | `admin-demo@sari-maadi.invalid` | `AdminDemo-2026!` |

Use the normal registration page to create a citizen account, or sign in with
an existing citizen account. Public registration always creates a citizen;
the role cannot be set by the registration request.

## Validation

Run `npm test`, `npm run lint`, and `npm run build` from the repository root.
