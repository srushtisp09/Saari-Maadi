# Phase 2C: Engagement and insights

## Goal

Give citizens a visible way to earn recognition and track their reports, while
giving Bengaluru residents and road authorities an aggregated view of road
conditions. The implementation keeps the existing Express, Mongoose, React,
Vite, Leaflet, and Oxlint stack, and excludes seeded reports from public and
authority analytics.

## Files created or changed

### Backend files created

- `server/config/badges.js` - the single source of badge names, descriptions,
  icons, metrics, and thresholds.
- `server/services/badges.js` - evaluates badge eligibility and awards badges
  idempotently.
- `server/services/points.js` - atomically awards points and stores a keyed
  points-history entry for weekly rankings.
- `server/services/leaderboard.js` - aggregates weekly/all-time points and
  calculates rank.
- `server/controllers/insightsController.js` - leaderboard, profile, city
  report card, and authority analytics endpoints.
- `server/routes/insights.js` - public and role-protected insights routes.

### Frontend files created

- `src/pages/LeaderboardPage.jsx` - weekly/all-time standings and pinned user
  position.
- `src/pages/ProfilePage.jsx` - points, badges, rank, and the user's reports.
- `src/pages/CityReportPage.jsx` - public city report card and share action.
- `src/pages/AnalyticsDashboard.jsx` - authority charts, hotspot list, and CSV
  download.
- `src/components/HotspotMap.jsx` - Leaflet report-density circles.
- `src/components/BadgeList.jsx` - accessible badge chips.
- `src/components/PageSkeleton.jsx` - reusable loading placeholders.
- `src/components/ThemeToggle.jsx`, `src/theme/ThemeProvider.jsx`,
  `src/theme/context.js`, and `src/theme/useTheme.js` - persistent light/dark
  theme.
- `src/toast/ToastProvider.jsx`, `src/toast/context.js`, and
  `src/toast/useToast.js` - global accessible feedback toasts.

### Changed files

- `server/models/User.js` - adds badge keys and append-only points history.
- `server/controllers/authController.js` - includes badge details in user data.
- `server/controllers/potholeController.js` - records all point awards,
  evaluates badge thresholds after report/upvote/fix events, and includes
  reporter badges in report responses.
- `server/app.js` - mounts the insights routes.
- `server/tests/authorityWorkflow.test.js` - covers badge idempotency, weekly
  points, profile/leaderboard, seeded-data exclusions, analytics, and staff
  authorization.
- `src/App.jsx` - adds public, protected, and staff-only pages and global
  theme/toast providers.
- `src/components/Home.jsx` - links to engagement pages.
- `src/components/RecentReports.jsx`, `src/pages/PotholeDetail.jsx`,
  `src/pages/ReportPothole.jsx`, and `src/pages/AuthPage.jsx` - loading,
  reporter badge, toast, and timeline polish.
- `src/pages/AuthorityDashboard.jsx` and `src/components/UpvoteButton.jsx` -
  status/upvote feedback.
- `src/index.css` - new page layouts, 375px responsive rules, loading states,
  toasts, and dark theme.

## How it works in simple words

### Points and badges

Each point award updates the user's total and appends a history entry in the
same atomic user-document update. A unique event key prevents a repeated
request from awarding points twice. The weekly leaderboard sums entries from
the last seven days; all-time ranking uses the existing total points.

The rules live in `server/config/badges.js`:

| Badge | Requirement |
| --- | --- |
| First Report | At least 1 real report |
| Good Samaritan | At least 5 real reports |
| Community Voice | At least 50 upvotes received across real reports |
| Problem Solver | At least 3 real reports fixed |

After a report, upvote, or repair, the server aggregates the citizen's totals.
Eligible badge keys are added with MongoDB `$addToSet`, so parallel requests
cannot duplicate a badge. The API returns badge descriptions with names so the
web app does not maintain a second set of badge rules.

### Analytics and city report card

The analytics API uses MongoDB aggregation facets to calculate status totals,
daily reports for the last 30 days, average repair time by severity, SLA
compliance, geographic density cells, and ranked areas. It returns a bounded
list of the latest 200 reports for the table and CSV download. The browser
renders those aggregate results; it does not calculate the analytics.

The public report card uses its own aggregation for city totals, percent fixed,
average repair time, areas with the most open reports, and top contributors.
Both APIs start from a `seeded != true` match, so demo reports do not affect
public numbers or hotspot rankings.

### Profile and visual feedback

The profile API returns the citizen's points, badges, all-time rank, and up to
100 of their latest real reports. Each report links to its status timeline.
The theme toggle stores the selection in local storage and applies it to the
document root. A shared toast region announces important success and error
feedback; the new pages also have loading, empty, and error states.

## Problems and fixes

- Weekly ranking cannot be reconstructed from a lifetime points total.
  Point-award history is now written atomically with the total, and each event
  has an idempotency key.
- Repeated badge checks can race when several events happen together.
  The server uses `$addToSet` rather than read-then-write array updates.
- Seed reports can distort public performance and authority hotspot numbers.
  Each aggregation excludes seeded documents before computing any facet.
- A client-only authority page would not protect analytics data. The analytics
  route also enforces authentication and the authority/admin role on the API.
- Mobile dashboards can become too wide with charts and report tables. Layouts
  collapse to one column and report rows remain horizontally readable at
  narrow widths.

## Interview questions this phase can answer

1. How can a points award be made idempotent under retries?
2. Why is weekly ranking different from sorting by a lifetime total?
3. What makes MongoDB aggregation useful for dashboards?
4. How do `$facet`, `$group`, and `$lookup` help calculate multiple metrics?
5. Why should test/seed data be excluded from a public report card?
6. How should the API protect a staff-only analytics dashboard?
7. How do you share badge metadata without duplicating business rules in the
   frontend?
8. What accessibility considerations apply to charts, tabs, toasts, and theme
   controls?

## Click-through test guide

1. Start the app with `npm run dev`, then open `/home`.
2. Click **Leaderboard**; switch between **This week** and **All time**. Sign
   in to see the pinned personal rank.
3. Sign in as a citizen and click **My profile**. Check points, badge chips,
   report statuses, and **View timeline**.
4. From the home page click **City report**. Check the totals, areas, and
   contributors; use **Share report card**.
5. Sign in as an authority or admin, then click **Analytics**. Check the four
   charts, hotspot map/list, and **Export current reports CSV**. A citizen
   account should not be able to open this page or its API.
6. Use the fixed **Dark/Light** control at the lower-right corner, reload, and
   confirm the selected theme remains active.
7. On a 375px-wide viewport, repeat the navigation and page checks; use Tab
   and Enter/Space to operate controls and links.

## Validation

From the repository root:

```powershell
npm run lint
npm test
npm run build
```
