# CLAUDE.md — AMS (airline-control / AMS.ceo)

Guidance for Claude Code working in this repo. Read this first; it captures the
non-obvious things that have caused real incidents and the way the user wants
work done.

## What this is

AMS is a persistent, real-time **airline management simulation** ("AMS.ceo").
Players run an airline across historical eras (1950s → present): buy/lease
aircraft, open routes, schedule flights, manage maintenance, pricing, marketing,
staff, loans and finances, competing against AI airlines in shared "worlds"
that advance on a server-driven game clock. Integrated with live flight-sim
networks (VATSIM).

## Tech stack

- **Backend:** Node.js + Express, Socket.IO for real-time, Passport (OAuth2 /
  VATSIM) for auth.
- **DB:** PostgreSQL via **Sequelize 6**, hosted on **Railway** (see Database
  rules below — this matters a lot).
- **Frontend:** server-served static HTML in `public/` + vanilla JS (no
  framework, no build step). Pages: dashboard, fleet, routes(-create/-edit),
  scheduling, finances, marketing, staff, loans, world-map, admin, etc.
- **Entry point:** `src/server.js`. `npm run dev` (nodemon) / `npm start`.
- Routing graph uses `ngraph`; geo via `@turf`.

## Architecture map

- `src/models/` — Sequelize models. Core: `World`, `WorldMembership`, `User`,
  `Airport`, `AirportRouteDemand`, `Aircraft`, `UserAircraft`, `Route`,
  `ScheduledFlight`, `RecurringMaintenance`, `WeeklyFinancial`, `Loan`,
  `MarketingCampaign`. `models/index.js` wires associations.
- `src/services/` — domain logic. Key ones:
  - `worldTimeService.js` — the game-clock heartbeat: advances world time,
    processes flights/revenue (`processTemplateRevenue`), maintenance
    (`processMaintenance`), AI, pruning. Large and central.
  - `gravityModelService.js` + `routeDemandService.js` — potential demand.
  - `seasonalityService.js` + `data/seasonalProfiles.js` — Summer/Winter demand
    glance (added 2026-05; archetype × era-maturity ramp).
  - `routeIndicatorService.js` — yield / competition / access / class-mix for
    the route picker.
  - `airwayService.js`, `geoService.js`, `vatsimService.js`, AI services.
- `src/routes/` — Express route handlers (`world.js` is the biggest; also
  `fleet.js`, `scheduling.js`, `finances.js`, `routes.js`, `admin.js`…).
- `src/config/` — `database.js`, `maintenanceConfig.js` (single source of truth
  for check durations), `passport.js`, `cargoTypes.js`.
- `src/data/` — static tuning data (gravity calibration, cultural ties, country
  economics, seasonal profiles, staff/bank/contractor config).
- `src/scripts/` — DB seed/migration/maintenance scripts (run via `npm run db:*`).
- `public/js/` — per-page frontend logic, same-named as the HTML.

## Demand model — two distinct layers (don't conflate them)

1. **Potential demand (0–100 score)** — a deterministic **gravity model**
   (`gravityModelService.js` + `data/gravityCalibration.js`):
   `AirMass_i^0.7 × AirMass_j^0.7 × dist^-0.7 × culturalTie`, calibrated per
   decade to historical world pax. Stored per airport-pair per decade in
   `AirportRouteDemand`; `routeDemandService.js` interpolates by year. **It is
   not random.** This is the route-picking / attractiveness signal.
2. **Actual demand (load factor / pax carried)** — `worldTimeService.js`
   `processTemplateRevenue`: `finalLF = baseLF × demand × maturity × prestige ×
   price × competition × time × reputation × variance`. Already models price
   elasticity, competition market-share, marketing, maturation, prestige,
   reputation, era, noise. The user is happy with this side — don't rewrite it.
3. **Seasonality** is a glance/indicator layer on the *potential* score
   (Summer/Winter via `seasonalityService`), damped toward flat in early eras
   (leisure air travel barely existed in 1950). It does **not** touch the
   load-factor/revenue math.

## Database rules (read before touching the DB)

- **Always use the live Railway Postgres. Never local Postgres.** There is no
  local Postgres on this machine; a `localhost` `DATABASE_URL` →
  `ECONNREFUSED` and cascades into auth/world-time/airway failures. In `.env`
  keep the Railway `DATABASE_URL` active and the localhost line commented.
  If you see `SequelizeConnectionRefusedError`, fix the URL — do **not**
  suggest installing/starting local Postgres. `config/database.js` already
  applies SSL for the public Railway proxy.
- **Schema sync is opt-in (changed 2026-05).** Boot (`server.js`) now does
  `sequelize.authenticate()` + idempotent `ADD COLUMN IF NOT EXISTS` guards
  only. `sequelize.sync({ alter: true })` runs **only when
  `DB_AUTO_SYNC=true`**. So normal restarts are instant and skip the
  maintenance screen. **A model/schema change will NOT reach the live DB on a
  normal restart** — either add a surgical `ALTER TABLE … ADD COLUMN IF NOT
  EXISTS` guard in the `server.js` pre-add block (preferred), or run one boot
  with `DB_AUTO_SYNC=true`, or `npm run db:sync`. A fresh/empty DB needs
  `DB_AUTO_SYNC=true` once to create tables.
- **Schema drift is a known hazard.** Historically `db:sync` /
  `sync({alter:true})` aborted partway on `airports.operational_from` not
  auto-casting to DATE, leaving later model columns missing. That specific
  blocker was **resolved 2026-05-18** (columns converted to DATE). A backup
  table `airports_opdates_backup` may still exist on the live DB — drop it
  only once confirmed stable. For any `column X does not exist` error, the
  safe fix is a surgical additive `ALTER TABLE <t> ADD COLUMN IF NOT EXISTS
  <c> <type>`, not a full sync.
- **Don't run `npm run db:sync` without the user's explicit go-ahead.** It's a
  heavy op; check the *actual* exit/output (don't let `| tail` mask failures).

## Fragile subsystems to be careful around

- **Maintenance engine** (`fleet.js` `createAutoScheduledMaintenance`,
  `worldTimeService.js` `processMaintenance` / `processAutomaticHeavyMaintenance`,
  `config/maintenanceConfig.js`). History: an invalid game clock once generated
  ~965K epoch-dated (1970) orphan rows; guards now abort scheduling when the
  clock is invalid/<1980. A per-world tiered prune sweep
  (`pruneOldMaintenanceRecords`) keeps `recurring_maintenance` bounded. A
  fleet-wide "aircraft never enter maintenance" bug was diagnosed and a fix
  implemented 2026-05-18 (size-scaled durations, lead-time horizon, 15%
  per-airline concurrency drain). If row counts balloon or pre-1980
  `scheduled_date`s appear, suspect the clock-gap path or a prune regression.
- **Per-world era scoping is essential** — worlds run at different eras (a
  1984 world vs a 2024 world); any time/era logic must be scoped per world.

## Dev workflow

- Run: `npm run dev` (nodemon). Server gates page requests behind
  `db-updating.html` until `dbReady`; now near-instant on normal restarts.
- Seeding/migrations: `npm run db:*` scripts (see `package.json`).
- SQL logging goes to `logs/sql.log` in development, not the console.
- No automated tests (`npm test` is a stub). Verify JS with `node -c <file>`
  and, for logic, a quick `node -e` harness.

## How the user wants Claude to work

- **Be direct and honest. Correct mistakes, don't agree to be agreeable.** When
  the user's mental model is off (e.g. "the demand score is random"), say so
  and explain. Don't over-claim: only say something is done/verified when it
  is, and show failing output rather than hiding it.
- **Plan non-trivial work before coding, and get sign-off.** For features with
  design choices, present options and confirm via the `AskUserQuestion`
  clickable multi-question format (the user explicitly prefers this). Don't
  unilaterally rewrite working engines.
- **Prefer additive, non-destructive changes.** New service + data file + one
  wired call + one render block beats refactoring. No schema changes unless
  approved; surgical `ALTER … IF NOT EXISTS` over full sync.
- **Confirm before app-wide or production-DB-sensitive changes** (boot
  behaviour, prod schema, anything hard to reverse). Investigate the real code
  before advising — don't answer DB/architecture questions from assumptions.
- **Don't commit or push unless asked.** Leave changes staged; offer to commit.
- **Syntax-check after edits** (`node -c`), and sanity-test logic with a small
  harness when behaviour matters (e.g. the LHR–GVA ski litmus test).
- **Track multi-step work with TodoWrite.** Keep one item in progress.
- **Match the surrounding code style** (this codebase is CommonJS, vanilla JS,
  no framework — ignore the editor's "convert to ESM" hint).
- The user maintains a persistent memory (`MEMORY.md` + files) — durable
  project facts/decisions live there; offer to update it after notable work
  rather than assuming.
