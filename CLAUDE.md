# CLAUDE.md — AMS (AMS.ceo)

Airline management sim. Players run airlines across eras (1950→present): aircraft, routes, scheduling, maintenance, finances, AI competition. VATSIM integration for live flights.

## Tech stack

- **Backend:** Node.js + Express, Socket.IO. Auth: local email/password (bcrypt). Passport for session plumbing only. Users keyed by `vatsimId` (local = `LOCAL-<uuid>`, don't remove column).
- **DB:** PostgreSQL via Sequelize 6, hosted on Railway.
- **Frontend:** Static HTML in `public/` + vanilla JS. No framework, no build step. CommonJS everywhere.
- **Entry:** `src/server.js`. `npm run go` (prompts Local/Railway). `npm run dev` (nodemon direct).
- Routing: `ngraph`. Geo: `@turf`.

## Key file map

| Area | Files |
|------|-------|
| Models | `src/models/` — `World`, `WorldMembership`, `User`, `Airport`, `Aircraft`, `UserAircraft`, `Route`, `ScheduledFlight`, `RecurringMaintenance`, `WeeklyFinancial`, `Loan`, `SightseeingTour`. Associations in `models/index.js` |
| Game engine | `src/services/worldTimeService.js` — clock, flights/revenue, maintenance, AI. Central + large |
| Demand | `gravityModelService.js` + `routeDemandService.js` (potential 0-100), `demandCacheService.js` (in-memory from `.gz`) |
| Routes | `src/routes/` — `world.js` (biggest), `fleet.js`, `scheduling.js`, `finances.js`, `routes.js`, `admin.js` |
| Config | `maintenanceConfig.js` (check durations), `bankConfig.js`, `billingConfig.js`, `cargoTypes.js` |
| Frontend JS | `public/js/` — same-named as HTML pages |
| Data | `src/data/` — gravity calibration, seasonal profiles, domestic demand (UK/US real data) |

## Database rules

- **Schema sync is opt-in.** Normal boot = `authenticate()` + additive `ADD COLUMN IF NOT EXISTS` guards. Full sync only with `DB_AUTO_SYNC=true` or `npm run db:sync`. Never run sync without user go-ahead.
- **New columns:** surgical `ALTER TABLE … ADD COLUMN IF NOT EXISTS` in server.js pre-add block (preferred over full sync).
- **Demand data:** `src/data/demandData.json.gz` (~18MB, committed as normal git file, no LFS). Loaded by `demandCacheService` at boot. If missing → all routes return demand 0. Regenerate: `node src/scripts/generateDemandData.js`.

## Demand model (two layers — don't conflate)

1. **Potential demand (0-100):** Deterministic gravity model. Stored per airport-pair per decade. Not random. UK/US domestic overridden by real data (CAA/BTS 2024). Other pairs still gravity-only.
2. **Actual demand (load factor):** `processTemplateRevenue` in worldTimeService. Price elasticity, competition, maturation, prestige, reputation, era. User is happy with this — don't rewrite.
3. **Seasonality:** Display/indicator layer only on potential score. Doesn't touch revenue math.
4. **Cargo:** Derived from pax magnitude × destination cargo character. Source of truth: `cargoDemandService.js`. Keep server + frontend `demandToPax` in sync.

## Maintenance — fragile, be careful

- Engine: `fleet.js` `createAutoScheduledMaintenance`, `worldTimeService.js` `processMaintenance`, `config/maintenanceConfig.js` (single source for durations).
- **A-check expiry is HOURS-based** (`totalFlightHours − lastACheckHours`). Any completion path MUST anchor hours.
- **PERFORM NOW** stamps in GAME time, sets `maintenance_until`. `processAutomaticHeavyMaintenance` restores.
- **Auto-schedule uses `findAvailableSlotCached`** inside `createAutoScheduledMaintenance` (not `findAvailableSlotOnDate` — patching only that changes nothing).
- Consecutive dailies keep 16h minimum gap. Slots randomised into free 15-min gaps with fleet de-clash.
- `processMaintenance` settles chronologically (`ORDER BY scheduled_date`).
- **"Checks vanish after load":** schedule endpoint fires background delete+recreate with 5s delay. Proper fix = transaction (someday).
- Guard: scheduling aborts when clock invalid/<1980 (prevents epoch-dated orphan rows).
- On-order aircraft have NULL check dates until delivery.
- Per-world era scoping is essential — worlds run at different eras.

## Scaling architecture (LIVE on Railway)

Web/sim split: `ams` (web, `SIM_AUTOSTART=0`) + `ams-sim` (`=1`) + Redis. **Env parity: new env vars must go on both services.** Window engine processes elapsed-time windows. Hot worlds tick finely; cold worlds batch-processed every 30-60 min. Per-world processing state (`_wp(worldId)`). Revenue batched per-world (`wp.revenueAcc`). Details in `docs/SCALING.md`.

Rollback flags: `WINDOW_ENGINE=0`, `HOT_COLD=0`, `WORKER_LEASES=0`, `REVENUE_BATCH=0`, `PRUNE=0`.

## Local dev

- `npm run go` → prompts Local/Railway, sets `SIM_AUTOSTART` (Local=1, Railway=0). Running sim on Railway = double-tick = 5-8s requests.
- Local PG 18 on port **5433** (this machine). `npm run db:pull` + `npm run db:seed-dev` for test worlds.
- Test worlds: Dev SP 1950/1980/2010 + Dev MP 1950. Login: `support@ams.ceo` (primary) or `dev@local.test`/`devpass` (fallback).
- db:pull is Windows-safe (temp PGPASSFILE, no `PGPASSWORD=x cmd`).
- SSL skipped for localhost URLs. `SequelizeConnectionRefusedError` → check PG service + port.
- No automated tests. Verify: `node -c <file>`. Logic: `node -e` harness.

## Key subsystem notes

- **Leasing:** Hard-gated pre-1970. Curve in `eraEconomicService`. All 5 lease-price producers use same curve.
- **Banks:** 12 banks in `bankConfig.js`. Max loan = netWorth × maxLoanPct × leverage(credit). Delivery loans exempt from one-per-bank rule.
- **Cabin outfitting:** `cabin-outfitting.js` (dual-env). Charged at purchase/lease/refit. Premium demand capped by `cabinClassService.computeClassMixForAirports`.
- **Sightseeing tours:** Own model (not Route). Revenue in `processSightseeingTours`. Scheduling integration is client-side only (synthesized pseudo-flights on grid).
- **Stripe:** `billingConfig.js` source of truth. Webhook BEFORE `express.json()`. Dormant until keys set. Never commit keys.
- **Admin 2FA:** `otplib` v12 (NOT v13). Step-up for admin panel. Backup codes + DB escape hatch.
- **Branding:** Procedural SVG logos. `airline-logo.js` (dual-env). Client SVG sanitised server-side.
- **Name filter:** `name-filter.js` (dual-env). Profanity + real airline names. IATA = 2 alphanumeric, ICAO = 3 alpha.
- **Scrap/fleet values:** Era-scaled. Watch for falsy-zero traps (`parseFloat(x) || default` treats age 0 as default).
- **Fuel calibration (PARKED):** Early-era fuel ~7× under-priced. Fix needs economy sign-off.
- **Navigraph:** PENDING credentials. Current navdata in `src/data/navdata/` (don't redistribute).

## Inline style gotcha

`font-family:'Courier New'` must use single quotes — double quotes break `style="..."` attributes and silently kill subsequent CSS properties.

`var(--bg-primary)` does NOT exist. Use `var(--background)` for page bg, `var(--surface)` for cards.

## How to work

- **Be direct.** Correct mistakes, don't agree to be agreeable. Show failing output.
- **Plan non-trivial work, get sign-off.** Use `AskUserQuestion` multi-choice for design decisions.
- **Additive changes.** New file + wire-in beats refactoring. `ALTER … IF NOT EXISTS` over full sync.
- **Confirm before** prod schema changes, boot behaviour changes, anything hard to reverse.
- **Commit only when asked.** Push to `main` (no feature branches). Keep `.claude/settings.local.json` out. DO commit `package-lock.json` when deps change.
- **Syntax-check after edits** (`node -c`).
- **Track work with TodoWrite.** One item in_progress at a time.
- **Match code style:** CommonJS, vanilla JS, no framework.
