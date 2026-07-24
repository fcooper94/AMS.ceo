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

## Real-data domestic demand anchoring (2026-07)

UK **and** US domestic demand are now anchored to **real data**, overriding the
gravity model for those pairs (applied at boot in `demandCacheService`, layered
on top of the gz gravity file — no regeneration):

- **UK:** CAA Table 12.2 annual-2024 (`src/data/caaDomestic2024.csv` →
  `ukDomesticReal2024.json` via `generateUkDomesticData.js`); ~306 routes.
- **US:** BTS T-100 Domestic Segment 2024 (`t100Domestic2024.csv` →
  `usDomesticReal2024.json` via `generateUsDomesticData.js`); ~12,538 routes.
  Codes resolve to ICAO by **`iataCode`** (handles Alaska `PA*`/Hawaii `PH*`/PR
  `TJ*`). `usDomesticDemandService.js` / `ukDomesticDemandService.js` hold the
  archetype **HISTORY_PROFILES** that back-project each route's real 2024 daily
  pax through the eras (business/leisure/lifeline/regional; US is deregulation-
  shaped, UK trunk/leisure/lifeline/regional).
- Real data **overrides** gravity; remaining domestic gravity pairs are
  **suppressed to a floor** (gravity over-rates domestic pairs that aren't
  really flown — it rated e.g. Birmingham–Prestwick at 1,600/day). Every
  commercial-civil UK pair still gets a non-zero floor. Records carry
  `isFloor` (real vs floored) and `isDomestic`, exposed via
  `getTopDestinations`.
- **Early-era display curve:** anchored domestic routes use a gentler
  `src/data/domesticEraScale.js` (`DOMESTIC_ERA`) curve in `demandToPax` instead
  of the steep world-pax one, so big routes don't clamp at the score-100 ceiling
  and read an identical ~137/day in 1950. It **cancels in display** (the
  back-projection divides by the same factor), so magnitudes stay real; only
  keep the front-end mirror in `routes-create.js` in sync with the data file.
- Seasonal archetypes are curated in `data/seasonalProfiles.js` (UK holiday →
  `generic_leisure`; US snowbird → `mild_winter`; US beach → `generic_leisure`;
  ski already tagged). `demandToPax`/cargo need the pax `isFloor`/`isDomestic`
  flags to scale correctly.

**Known next steps / not-yet-done (do NOT assume these are done):**
- **International & non-UK/US-domestic pax still run on raw gravity** — not
  anchored, tends to overestimate (e.g. PHX–CYVR ~4,400/day). Anchor via T-100
  international / other sources if realism there matters.
- **Snowbird archetype is symmetric** — a route *from* a US snowbird base reads
  `mild_winter` in both directions (e.g. showed SUNBELT on a Vancouver route).
  Consider making it directional.
- **Tiny routes still round to 0** in some displays under a few pax/day.

## Cargo demand — now drives revenue (2026-07)

The per-route, per-type cargo figures shown in the route picker are still the
**display / attractiveness** layer, but cargo revenue is **now wired to the same
market** (as of 2026-07 — replaced the old flat-`baseDemand` stub).

- Cargo is **derived**, not stored (don't build a 30M per-type-per-route file):
  `route cargo = route pax (magnitude) × destination cargo character (mix)`.
  The destination mix/intensity is per-airport from `airportCargoService`
  (`cargoProfile`, era-RELATIVE 0–100 per type; absolute era growth is applied
  once in the tonnes conversion — do not double-scale).
- Two pax-linked components: **belly** (~20 kg/pax, General — bags, present
  wherever there's pax, every era) + **commercial freight** (~35 kg/pax matured
  over eras, split across types by the dest mix, incl. per-type era availability
  e.g. no express pre-1971). Front-end tonnage displays as kg <1t, 0.1t from
  1–5t, whole tonnes above (`fmtTonnes`; keep values fractional — don't
  pre-round).

**Server-side single source of truth: `src/services/cargoDemandService.js`**
(new). Holds `demandToPax` (a **mirror** of the front-end `routes-create.js`
one — reuses `gravityCalibration.worldPassengers` + `data/domesticEraScale`;
keep the two in sync), `cargoEraMult`, `destCargoIntensity`, and
`routeCargoMarket({routePax, year, cargoProfile}) → { bellyGeneral,
commercialByType }` (kg/day). The revenue engine and the modal now compute the
market the same way.

**Revenue path** (`worldTimeService.processFlightRevenue`, the cargo block):
1. Route daily cargo **market** = `demandToPax(routeDemandValue, year,
   isDomestic)` × dest `cargoProfile` (via `computeAirportCargoDemand`).
2. **Belly is pax-only:** belly General is added to the tappable market **only
   if the aircraft carries passengers** (`aircraft.aircraft.type !== 'Cargo' &&
   passengers > 0`). A pure **Cargo** aircraft taps the **commercial** market
   only — incl. commercial-General (mail/freight), just not passenger bags.
3. **Fair-share:** carried kg per type is capped at `market × (myAlloc /
   Σ alloc across all routes on the pair)`. Undersupplied market → everyone
   carries their full allocation; oversupplied → proportional slice. The
   competitor allocations come from the **existing** `competingRoutesList` /
   `compAircraft` queries, extended to also load `cargoConfig` + aircraft
   `type` (hoisted into `cargoCompetitorAllocs`).
4. **Rate elasticity:** over-priced cargo sells less vs an era-scaled benchmark
   (`CARGO_TYPES[type].defaultRate × getEraMultiplier(year)`); below-market gets
   a small bonus (capped, never exceeds allocation). The old **flat per-type
   `baseDemand` fudge was dropped** (the cap + elasticity replace it).
   `routeDemandService.getRouteDemand` now returns `isFloor`/`isDomestic`.

**Resolved (2026-07):** AI `cargoConfig` allocations verified — set via
`aiFleetConfigService.configureCargo()` at route creation; runtime fallback
added for null configs. Seasonal split threaded into cargo revenue (cosine
blend by game month). Era-scaled `defaultCargoRates` fallback for routes
with no rates set. `isDomestic` flag correctly passed to cargo `demandToPax`.

## Local dev — test-data environment (reworked 2026-07-24)

Local dev runs against a **local PostgreSQL with seeded test worlds only** —
NOT copies of production. Two machines exist; on the current one PostgreSQL
**18 is on port 5433** (17 also installed on 5432 — unused, safe to remove).
Railway itself runs PG 18.4, so pg_dump must be v18+ (`pullLocalDb.js`
auto-detects the newest installed version's binaries).

- **Mode switch:** `npm run go` asks **"Test data (Local)"** vs **"Real data
  (Railway)"**, rewrites `DATABASE_URL` in `.env` and starts nodemon. It also
  sets `SIM_AUTOSTART` for the server: Test → `1` (sim ticks the Dev worlds
  locally), Real → `0` (sim OFF — the production server already ticks those
  worlds; running it locally double-ticks them and drowns every request in
  pool-queue latency, the "everything takes 5-8s" symptom). A bare
  `npm run dev` prompts "Start world simulation?" on a TTY instead.
- **Setting up a machine from scratch:**
  1. `winget install PostgreSQL.PostgreSQL.18` (18+, matching Railway)
  2. `.env`: `LOCAL_DATABASE_URL=postgresql://postgres:<pw>@localhost:<port>/airline_control`
     and `RAILWAY_DATABASE_URL=<the Railway URL>` (db:pull needs both)
  3. `npm run db:pull` — drops/recreates the local DB with **reference data
     only** (schema, airports, aircraft types, users, settings). Production
     worlds/fleets/routes are excluded by default;
     `-- --with-worlds` copies them too and auto-pauses them locally.
  4. `npm run db:seed-dev` — creates the test worlds.
- **Test worlds (`src/scripts/seedDevWorld.js`):** Dev SP 1950 / Dev SP 1980 /
  Dev SP 2010 (singleplayer) + Dev MP 1950 (multiplayer). Each has a
  "Dev Airways" (DEV/DV, base KPHX, 10× era starting capital, branding,
  3 owned era-appropriate aircraft, 2 routes with era ticket prices, 8 weeks
  of financials). Idempotent; `-- --fresh` destroys + recreates. Hard guard:
  refuses to run unless DATABASE_URL is localhost. **Ownership/login:** the
  seeder attaches the dev worlds to **`support@ams.ceo`** when it exists (the
  user's actual local login, PIN via `SUPPORT_PIN`); it only creates/uses
  `dev@local.test` / `devpass` as a fallback on a DB without that account.
- **db:pull is Windows-safe (2026-07):** passwords via a temp `PGPASSFILE`
  (never `PGPASSWORD=x cmd` prefixes — Unix-only, breaks under cmd.exe), and
  it verifies `airports` is non-empty after restore because cmd.exe pipelines
  only report the LAST command's exit code (a pg_dump version-mismatch abort
  otherwise looks like success with an empty DB).
- **SSL:** `config/database.js` skips SSL for localhost/127.0.0.1 URLs.
  Railway public proxy still uses SSL; private `.railway.internal` too.
- **Schema sync:** local schema comes from `pg_dump` — matches production.
  Normal sync rules apply (opt-in `DB_AUTO_SYNC=true`).
- If `SequelizeConnectionRefusedError` on the local URL: check the service
  (`postgresql-x64-18`) and that the port in `LOCAL_DATABASE_URL` matches the
  installed instance (5433 on this machine).

## Database rules (read before touching the DB)

- **Default to Railway Postgres for production.** Use `npm run go` to switch.
  If you see `SequelizeConnectionRefusedError` on a Railway URL, fix the URL.
  `config/database.js` applies SSL for the public Railway proxy. Local
  Postgres setup is per-machine — see "Local dev — test-data environment".
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

## Demand data file — gzip, not LFS (2026-07)

Demand is served **entirely from an in-memory cache** built at boot by
`demandCacheService.initialize()` from a static file (routeDemandService does
**zero DB queries** — `airport_route_demands` is not read at runtime). So if the
file doesn't load, **every route returns `demand: 0` (`no_data`)** — flights
still fly at the LF floor but demand is flat/broken.

The raw `src/data/demandData.json` is ~172 MB. It **used to be Git LFS**, but
Railway doesn't pull LFS on deploy, so the server saw only the LFS pointer and
crash-looped on `JSON.parse`. **Fixed by shipping a gzip instead:**

- **`src/data/demandData.json.gz` (~18 MB) is committed as a normal Git file**
  (no LFS — deploys everywhere incl. Railway). The plain `.json` is now
  **git-ignored** and untracked; `.gitattributes` marks `*.gz binary` and the
  LFS rule is gone.
- `demandCacheService` loads the `.gz` first (`zlib.gunzipSync`), falling back
  to the plain `.json` for local dev, with guards for LFS-pointer / parse
  errors (degrade, don't crash). ~18 MB decompresses in ~1s.
- **Regenerate with `node src/scripts/generateDemandData.js`** — it writes both
  the `.json` and the committed `.gz`.
- Heads-up: the `npm warn config production Use --omit=dev` line on Railway is a
  harmless deprecation warning (an npm `production=true` config), not an error.

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

- **Start server:** `npm run go` (prompts Railway/Local, then nodemon) or
  `npm run dev` (nodemon directly, uses whatever `DATABASE_URL` is in `.env`).
- Server gates page requests behind `db-updating.html` until `dbReady`;
  near-instant on normal restarts.
- Seeding/migrations: `npm run db:*` scripts (see `package.json`).
- SQL logging goes to `logs/sql.log` in development, not the console.
- **Startup prompts must be TTY-gated, never `NODE_ENV`-gated.** The "Load
  demand data?" prompt runs only when `process.stdin.isTTY` (local dev);
  headless (Railway/CI) auto-loads the demand cache and never blocks on input.
  Heads-up: **Railway currently has `NODE_ENV=development`**, so anything gated
  on `NODE_ENV === 'development'` (SQL logging to `logs/sql.log`, verbose admin
  error logs) is ON in production — prefer setting it to `production` there.
- No automated tests (`npm test` is a stub). Verify JS with `node -c <file>`
  and, for logic, a quick `node -e` harness.

## Route picker — indicator columns (updated 2026-05)

`public/js/routes-create.js` renders the destination airport list with these
columns: Airport · Dist · **Demand** · Yield · Comp · **Capacity (🔍)**.
Class column was removed. CSS grid is in `public/routes-create.html`:
`grid-template-columns: 1fr 52px 78px 44px 54px 62px` (6 cols).

### Demand cell (`generateDemandIndicator`)
Shows estimated pax/day in amber (summer) / blue (winter), converted from the
0–100 demand score via `demandToPax(score, year)`. Archetype label below
(e.g. `BEACH`, `SKI`, `BUSINESS`, `LEISURE`, `YEAR-ROUND`). Hover tooltip
shows mini bars in pax + archetype description + swing text.

**Conversion formula** (in `routes-create.js`):
```
pax/day = score × 80 × (worldPax[year] / worldPax[2020])
```
`WORLD_PAX_M` table mirrors `gravityCalibration.js worldPassengers`.
Score 100 in 2020 = 8,000 pax/day (≈ world's busiest route). Era-scales
linearly, e.g. score 60 → 4,800 pax/day (2020), ~280 pax/day (1960).
Archetype `vfr` was renamed `leisure` (2026-05) in both
`seasonalProfiles.js` and `seasonalityService.js`.

### Capacity cell (`generateSupplyIndicator`)
Shows gap label (`OPEN/GAP/LOW/MED/SAT`) + a **magnifying glass button**.
Clicking opens `#capacityPanel` — a pinned `position:fixed` card that stays
open until X is clicked or user clicks outside. Panel header shows the route
(`EGLL ↔ EGAA`) with subtitle "both directions (symmetric)".

Panel contains a 7-day bar chart (Mon–Sun), 4 bars per day in pax/day:
- **Summer demand** (amber) — score × DOW_MULTIPLIER × demandToPax
- **Winter demand** (blue) — same with winter score
- **Total capacity** (grey) — all airlines' actual seats/day from DB query
- **My capacity** (accent) — exact seats from my fleet's cabin config

All 4 bars share the same pax/day scale. "Capacity" = seats if planes were
full (potential supply, not actual pax carried).

**My capacity** is built in `myCapacityByDay` global
(`destAirportId → [mon..sun]` seat totals). Populated alongside `myByDayMap`
from `allRoutes` using fleet seat config:
`economySeats + economyPlusSeats + businessSeats + firstSeats`, falling back
to `aircraft.passengerCapacity` when custom cabin not configured.

**Market capacity** comes from `routeIndicatorService._queryMarketFrequency`
which now `LEFT JOIN user_aircraft + aircraft` and returns both
`{ flights: [...], capacity: [...] }` per destination (Sun-first arrays).
`capacity` uses `COALESCE(custom_seats_sum, passenger_capacity, 150)` per
flight. Indicator result exposes `marketByDay` (flights, for gap label) and
`marketCapacityByDay` (seats, for chart bars).

Demand/capacity data is **symmetric** — queries count both dep→dest and
arr→dest directions together, so one chart covers both legs of the route.

### Tooltip system
Indicator hover tooltips use a **global `#globalIndicatorTooltip`** div
(`position:fixed`, `z-index:9000`) driven by JS event delegation, not CSS
`:hover`. This escapes `overflow:auto` on `#availableAirportsList`.
On `mouseover .indicator-hover`, copies `.indicator-tooltip` innerHTML into
the global div, inherits its `style.minWidth`, then positions via
`requestAnimationFrame` + `getBoundingClientRect`. Inline `.indicator-tooltip`
divs are `display:none !important` — their HTML is read by JS only.

## Airline branding & logos (added 2026-07)

Every airline (player **and** AI) has a procedural SVG **logo** + a 3-colour
scheme stored on `WorldMembership`: `backgroundColor`, `primaryColor`,
`secondaryColor`, `logoTemplate`, `logoSvg` (nullable; hex colours / an inline
`<svg>` string). No schema change is needed to add more — the columns exist.

- **Generator:** `public/js/airline-logo.js` — **dual-environment** (browser
  globals + `module.exports` for Node). `generateAirlineLogos(name, bg,
  primary, secondary, seed)` returns 8 "livery card" wordmark logos (the name
  on a primary-colour background — no white box) drawn from a 10-template pool;
  `seed` reshuffles (stable while typing, changes on "Fresh designs").
  `pickAirlineBranding(name)` returns a full deterministic branding set
  (palette + one logo) — used server-side for AI + backfill. Two-letter mark =
  first letter of each of two words ("British Airways"→BA), else first two
  letters. Name is HTML-escaped into the SVG (`_esc`).
- **Setup:** branding is its **own wizard step** (SP step 3, MP/rejoin step 2)
  in `public/world-selection.html` + `world-selection.js`: colour wells + an
  8-logo grid + shuffle. The chosen logo is submitted with the create/join
  payload.
- **AI logos:** `aiSpawningService.js` calls `pickAirlineBranding` at spawn;
  `src/scripts/backfillAirlineLogos.js` fills any airline missing a logo
  (idempotent, deterministic by name). All existing airlines were backfilled on
  Railway 2026-07 (3720/3720).
- **Display:** sidebar (`layout.js`), competitors page (`competition.js`;
  `/api/world/competition` list+detail return `logoSvg`), and the world-map
  "Other Airline" panel (`world-map.js`; the map flights endpoint in
  `scheduling.js` returns `logoSvg`).
- **Security:** client-submitted SVG is **sanitised server-side**
  (`worldSelection.js` `sanitizeLogoSvg`: SVG-only, no `<script>`/event
  handlers/external refs) because logos are injected as HTML and shown to other
  players. Colours validated as hex; template id `[a-z]{1,20}`. AI/backfill SVG
  is self-generated so it's trusted.

## Airline name filter (added 2026-07)

`public/js/name-filter.js` — dual-environment. `checkAirlineName(name)` →
`{ ok, reason }`. Blocks **profanity/slurs** (whole-word match + a curated
substring set that deliberately avoids Scunthorpe-type false positives — e.g.
`ass`/`cock`/`dick` are whole-word only, not substrings) and **real-world
airline names** (~250, normalised exact match). Enforced in the setup "Next"
gate (`world-selection.js`) **and** all three create/join endpoints
(`worldSelection.js`). Extend either list in one place; both layers pick it up.

**IATA codes are 2 *alphanumeric* chars** (`U2`, `3K`, `BA`) — validated
`/^[A-Z0-9]{2}$/`. ICAO stays 3 letters (`/^[A-Z]{3}$/`).

## Setup wizard validation (2026-07)

The create/join wizards validate the **airline step on "Next"** (name, name
filter, ICAO, IATA, base airport) via `advanceModalStep`/`validateModalStep`
in `world-selection.js`, not only at final submit. Steps are shown by
`showModalStep(prefix, N)`; `MODAL_STEP_CONFIG` holds the step count per prefix
(sp/mp/rejoin). If you insert/reorder steps, renumber the `{prefix}Step{N}` /
`{prefix}StepInd{N}` ids **and** the branding-init/contractor-start offsets.

## Cabin & cargo configurators — per-ICAO datasets (2026-07)

`public/js/cabin-configurator.js` (seat map) and `public/js/cargo-configurator.js`
(hold map) are loaded on the marketplace, fleet and scheduling pages.

- **Seat abreast** is real per-airframe data in **`AIRCRAFT_CABIN`** (keyed by
  ICAO = fuselage cross-section; ~200 entries). Twin-aisle widebodies carry
  explicit premium cabins; single-aisle/regional **derive** premium (one fewer
  per side). Resolver `getIcaoCabin`; precedence: **airship → per-ICAO →
  capacity-bucket fallback → widebody override → type default**. Fuselage width
  derives from total abreast (one source of truth).
- **Airships** (type `Airship`) use `getAirshipCabin` (capacity-scaled gondola,
  1-1/2-1/2-2) and a **cylindrical capsule** fuselage — no cockpit — via the
  `shape='capsule'` param on `renderFuselage`. Airships have no real ICAO type
  code, so any per-ICAO map keys them out.
- **Cargo belly holds** are per-ICAO in **`AIRCRAFT_HOLDS`** (Fwd/Aft/Bulk
  templates by fuselage size). **Bulk hold carries GENERAL cargo only** — special
  types go in Fwd/Aft (visual only; allocation is still by type). The belly
  diagram **scales to aircraft size** (`_bellySizeClass` sm/md/lg → grid cols,
  pallet size, fuselage width, display cap); airships use the capsule shape here
  too. `window.aircraftNoImage()` (defined in cabin-configurator.js, the shared
  dependency) is the branded no-photo placeholder used by all three pages.
- Watch out for a stray **`filter: invert(1); mix-blend-mode: screen;`** in
  `aircraft-marketplace.js` — it's only correct on the aircraft `<img>` and the
  parchment contract document; it was copy-pasted onto ~30 UI elements and
  inverted their dark-theme colours (cleaned up 2026-07).

## Cabin outfitting costs & premium demand cap (2026-07)

Premium cabins now cost real money to install AND premium fares are
demand-capped — an all-First plane is allowed but is an economic decision, not
an exploit.

- **`public/js/cabin-outfitting.js`** (dual-environment, like name-filter.js) is
  the single source of truth: per-seat costs Y $10k / Y+ $25k / J $150k / F
  $400k (2024 USD), era-scaled by the caller (`getEraMultiplier` server-side,
  `marketplaceEraMultiplier` from `/api/world/info` client-side).
  `cabinOutfittingCost(seats, eraMult)` + `cabinRefitCost(new, old, eraMult)`.
- **Charged everywhere seats are installed** (`src/routes/fleet.js`): purchase
  (single + bulk — added AFTER the bulk discount), lease (one-off at signing;
  lessor receives the lease payment only), and **cabin refit = DELTA-UP per
  class** (pay for seats added, no credit for removals — so buy-cheap-then-refit
  costs exactly the same as configuring at purchase; downsizing is free).
  Player-listing sellers receive the **airframe price only**, never the buyer's
  outfitting spend. Bulk-lease takes no cabin config → nothing to charge (later
  config goes through the charging refit endpoint).
- **Premium demand cap** in `processFlightRevenue`: when an aircraft has premium
  seats, pax are allocated by `cabinClassService.computeClassMixForAirports`
  (new helper; era/GDP/distance/hub-aware — First ~12% of pax in 1950 → ~1%
  today, no J pre-1978, no Y+ pre-1992/short-haul). Premium seats beyond the
  route's demand fill with **economy-fare op-ups**. Total pax carried unchanged;
  only the fare split. Unconfigured/all-economy aircraft (incl. ALL AI) keep the
  identical old proportional path. AI neither pays outfitting nor is capped —
  net neutral.
- **Configurator** (`cabin-configurator.js`): premium may fill the whole cabin
  (`canAdd` is `<= totalSpace`, not `-1`); **economy is semi-manual** — it
  auto-fills leftover space but `econCapOverride` lets − reduce it to 0 (freed
  space stays empty), + restores toward auto; reduced counts survive re-opening.
  WC control renders disabled "Aircraft too small" when `_toiletDefaults.max`
  is 0 (≤19 pax). Modal width is **pinned after first render** (fit-content made
  it jump as the mix changed; outgrown diagrams scroll inside).
- **Marketplace modal**: `#costBreakdown` card (Airframe / Cabin fitting /
  Total) between the config rows and the acquisition boxes, filled by
  `updateConfigSummary()`; the box price (`.acq-total[data-base]`) becomes the
  all-in total. Used PURCHASE box is gold (#F59E0B) matching ORDER NEW; modal
  footer buttons removed (X + inline boxes only). **Lease UI is fully hidden
  pre-1970** (`leasingAvailableNow()` mirrors `eraEconomicService
  .leasingAvailable`): the list's LEASE/WK column (`.no-lease` 5-col grid
  variant) and the modal lease boxes. Used detail modals show a **TAKE OUT
  LOAN** card → `/loans` (used purchases aren't financed per-airframe — that's
  new-orders only). Used-market generated ages are **never 0**: min 0.2y, one
  decimal under 3y (`src/routes/aircraft.js`).

## Aircraft loans & fleet capital in the P&L (2026-07)

- **One loan per DELIVERED aircraft**: a financed order of 7 creates 7 loans,
  each materialising at that airframe's delivery (`worldTimeService` delivery
  block) — the order only takes the 30% deposit. **Delivery loans are
  deliberately exempt from the one-loan-per-bank rule** (asset finance vs the
  loans-page corporate credit line).
- **`loans.reference` column** (additive guard in server.js) labels delivery
  loans `"N-123AF Boeing 377 — ordered 1950-03-25"`; set at both delivery-loan
  creation sites (chosen bank + insufficient-funds Condor fallback), shown as
  a muted sub-line on the loans page. Generic bank loans have no reference.
  Existing loans were backfilled by matching origination date to delivery date.
- **`weekly_financials.fleet_capital_costs`** (additive guard) — the
  **"Aircraft Purchases"** category on the finance report: its own top-level
  OUTGOINGS line (not inside Overheads — large one-off sums). Recorded via
  `WeeklyFinancial.addCost(membershipId, gameTime, field, amount)` at: order
  deposits (single + bulk), cash delivery remainders, used purchases (incl.
  outfitting), lease outfitting, refit outfitting. All wrapped in try/catch —
  bookkeeping must never block a purchase. Loan-financed deliveries record
  **nothing** here (no cash moves; repayments already show as Loan Payments).
  Past order-deposit weeks were backfilled from `user_aircraft.deposit_paid`.

## Sightseeing Tours (new feature, 2026-07)

A **scenic pleasure flight** that loops from/to one base airport over
map-clicked scenic waypoints. **Deliberately its own model, NOT a Route** — the
user chose clean separation over the (recommended, lower-effort)
`Route`-discriminator approach.

- **Model** `src/models/SightseeingTour.js`: `baseAirportId` + JSON `waypoints`
  `[{lat,lng,name}]` + `distanceNm`/`durationMin` + `ticketPrice` +
  `assignedAircraftId` + `daysOfWeek` + `scheduledDepartureTime` + `isActive` +
  metrics. Table created **non-destructively** via
  `src/scripts/createSightseeingToursTable.js` (`Model.sync()` = CREATE IF NOT
  EXISTS) — already run on Railway.
- **API** `src/routes/sightseeing.js` at **`/api/sightseeing-tours`** (CRUD).
  Server computes round-trip distance + duration from aircraft cruise speed and
  validates range/waypoints.
- **Builder** `/sightseeing/create` (`sightseeing-create.html` + `.js`) — an
  interactive Leaflet map; click to drop waypoints. **`?id=<tourId>` = edit
  mode** (only price + aircraft editable, everything else locked). Aircraft is
  assigned **by TYPE** (dropdown grouped by type; stores a representative
  `UserAircraft`), matching how routes work.
- **Revenue** `worldTimeService.processSightseeingTours` — runs once per
  operating day off the tour's own `daysOfWeek` + time (**NOT** `ScheduledFlight`).
  **Flat, price-driven load** (0.9 baseline, softened above a duration-based
  suggested price of ~$3/scenic-min × `eraMultiplier`); era-scaled costs;
  grounded aircraft don't fly. `eraMultiplier` is now exposed via
  `/api/world/info` for consistent client pricing.
- **Scheduling integration is "Option B" — client-side only, no
  `ScheduledFlight`** (the whole server scheduling layer is Route-mandatory).
  Tours render on the grid as **synthesized pseudo-flights**
  (`buildTourPseudoFlights` → merged in `getFlightsForDay`; weekly + daily
  renderers both have tour branches). The drag panel lists tours; drop sets the
  tour's days/time/aircraft via **PUT**. **Conflict prevention is client-side
  and bidirectional** (tour-vs-routes+tours, route-vs-tours) using time windows.
  **"Remove from schedule" pauses (`isActive:false`, keeps the aircraft
  allocation)** — it does NOT unassign; re-dragging reactivates. Paused tours are
  skipped by both the grid and the conflict checks.
- **List**: a separate "Sightseeing Tours" table on the routes page
  (`routes.js`) with Edit (✎) + Delete.
- **⚠ The large `scheduling-v3.js` integration is not fully browser-verified.**
  It was built + `node -c`-checked but iterated via user screenshots; several
  drag/render bugs were only found once running (e.g. `dragover` must call
  `preventDefault()` for tour drags or the drop is refused). Expect more edge
  cases here — test in the browser.

## Aircraft leasing — hard gate + historical curve (2026-07, IMPLEMENTED)

Leasing is **hard-gated before 1970** (ILFC founded 1973) and priced from
**one curve** in `eraEconomicService`: `leasingAvailable(year)`,
`getLeaseMonthlyRatePct(year)` (null pre-1970; 1.8%/mo of value in 1970 →
0.7%/mo from 2010, interpolated) and `getWeeklyLeaseRate(value, year)`
(÷4.33; value is the already-era-scaled price — don't double-scale).

- **All five lease-price producers use the curve** (replaced four
  inconsistent formulas): new listings (`aircraft.js`), generated used
  listings (±10% variance), the price-guide stats (`fleet.js`),
  admin-created listings (`admin.js`), and AI (`decideAIAcquisition` —
  this also fixed a double-era-scaling bug that made 1950 AI leases 10×
  too cheap, and the old 1%/wk AI rate that was ~6× too expensive in
  modern eras).
- **Pre-1970 UX**: server returns `leasePrice: null` (frontend hides the
  lease column/buttons automatically — it already handled null); stored
  DB listings are masked when served; the lease, bulk-lease and lease-out
  endpoints reject server-side with a clear message.
- **Existing contracts were honoured, not cancelled**:
  `src/scripts/repriceLeasesToCurve.js` (idempotent — only ever lowers
  toward the curve; pre-1970 worlds priced at the 1970 anchor) was run on
  Railway 2026-07-23: 5,513 leases repriced, ~$28.5B reimbursed. Many AI
  airlines went from negative to positive balances — expect AI expansion
  after such a run. `fixLeaseRates.js` (old ×eraMult approach) is
  superseded; don't run it.

## Banks & loans — era rates + credit-scaled caps (2026-07)

- **12 banks** in `data/bankConfig.js` (added Sakura/Continental/Aurora/
  Liberty/Southern Cross to the original 7), spanning 2.2%–6.5% base and
  350–700 credit-score entry. One active loan per bank still applies, so
  more banks = more max concurrent player loans (~12). **Aircraft delivery
  loans are exempt from this rule** — see "Aircraft loans & fleet capital".
- **Max loan** = `netWorth × bank.maxLoanPct × leverage(creditScore)` —
  leverage runs 1× (score ≤500) to 3× (850). The old flat `× 10` fudge is
  gone (it offered a day-old 1950 airline £41M).
- **Era interest rates**: `ERA_RATE_ANCHORS` / `getEraRateAdjustment(year)`
  in bankConfig — percentage points added to every bank's base rate,
  interpolated (+1% 1950 → +9% at the 1981 Volcker peak → ~0% 2010s →
  +2% post-2022). `calculateOfferRate(bank, score, type, worldYear)` —
  all call sites pass the year (offers/apply, starter loans, delivery
  loans, AI).
- **AI parity**: AI caps use `balance + owned fleet value` with the AI
  credit score, same formula as players.

## Order flow — Finance Details step + repayment strategy (2026-07)

New-aircraft ordering is a 3-step flow in `aircraft-marketplace.js`:
**Order** (qty, cash/loan; cash skips ahead) → **Finance Details** (loan
only: compact accordion bank list showing *only* banks that can fund the
whole order, procedural colour/monogram `bankBadge()` per bank, term
slider, repayment strategy fixed/reducing/interest_only, cost breakdown
with styled `.fb-info` tooltips) → **Registration** (compact fixed-layout
reg table + auto-maintenance toggles).

- **`user_aircraft.financing_repayment_strategy`** column (additive ALTER
  guard in server.js) stores the chosen strategy; the delivery loan in
  `worldTimeService` is created with it and the correct first-week payment
  (`processLoanPayments` already handled all three strategies).
- Known trust hole (pre-existing): the order endpoints don't validate the
  loan amount against the bank cap server-side — only the client does.

## Scrap & fleet-modal displays (2026-07)

- **Scrap offers are era-scaled** (`fleet.js` GET `/scrap-offers` + POST
  `/scrap` cap): base = `purchasePrice × eraMult`. Before this, a 1950
  B377 bought for £1.6M scrapped for £4M (free money). AI scrap values
  and fallback sale prices in `aiDecisionService` era-scaled too.
- **Falsy-zero traps**: `parseFloat(x) || default` treated a brand-new
  aircraft (age 0) as 10 years old — use `Number.isFinite` guards for
  age/condition-style values where 0 is legitimate.
- **Fleet/scheduling detail modals**: Operating Costs shows *lifetime
  actuals* (flights, avg cost/flight, lifetime costs/profit from the
  details endpoint's `actuals` block) once flown, labelled "Estimated"
  (with tooltip) until then. NB route lifetime totals move with a route
  if it's reassigned to another aircraft, and totals from before the
  2026-07 economy fixes are polluted by old costs/fares — they dilute
  but never wash out.
- **Display-mirrors-engine rule**: weekly fuel estimate is
  `burn × 0.75 × fuelMult × eraMult` (both multipliers — omitting eraMult
  showed 10× in 1950). Any client-side cost estimate must mirror
  `eraEconomicService.calculateFlightCosts`.

**⚠ Open calibration issue — fuel too cheap in early eras:**
`getFuelCostMultiplier` values are authored as *absolute* price ratios
("0.08 = $0.15/gal") but `calculateFlightCosts` multiplies them by
`eraMult` as well, so 1950 fuel is ~7× under-priced (An-2 fuel ≈ £1/hr).
Historically maintenance-vs-fuel for a 1950 Stratocruiser was roughly
1:1, not 10:1. The fix is to recalibrate the fuel table to be *relative*
to the era (1950 ≈ 0.6–0.7), but that's an economy-tuning decision —
raises all early/mid-era fuel bills right after the 2026-07 rebalance.
Deliberately parked; get sign-off before changing.

## Scaling roadmap — hot/cold worlds (see docs/SCALING.md)

**STATUS (2026-07-24): Phase 3 (web/sim split) is DEPLOYED on Railway and
verified** — `ams` web-only (`SIM_AUTOSTART=0`) + `ams-sim` (`=1`, no public
domain) + Redis. **Env parity rule: any new env var added to the web service
must also be added to `ams-sim`** (same image/boot path; deploy broke on
missing VATSIM keys — passport is now env-gated, f1181b6, and VATSIM OAuth
login is no longer used; full rip-out pending). Phases 1-2 (window-based
engine refactor + hot/cold scheduler) are NOT started — do them in a
dedicated session; sim steady-state TICK-SLOW on the big AI worlds
(maintenance 4-8s/cycle, one 100s flights spike) is the Phase 1 baseline.
Key split mechanics: web role serves game time from a 15s DB
mirror in `worldTimeService.getCurrentTime`; sim role reconciles world
create/pause/resume/accel/delete from the DB every 15s; sim emits sockets
via `@socket.io/redis-emitter`, web fans out via the Redis adapter.

Target: ~1,000 players with 2-3 SP worlds each (~3K worlds, all "24/7") plus
~20-60 MP worlds. **Plan lives in `docs/SCALING.md`** — read it before any
architecture work. Core decision (2026-07-24): worlds always *advance* but
only **hot** worlds (human online / MP) tick finely; **cold** worlds are
batch-processed in elapsed-time windows every 30-60 real min. Phases:
window-based engine refactor → hot/cold scheduler → web/sim service split
(`SIM_AUTOSTART` groundwork exists; needs Redis for Socket.IO + sessions) →
lease-sharded sim workers. Databases do NOT split — single Postgres + Redis.
The event-loop stall monitor + `[TICK-SLOW]` logs are the tripwire for
starting the service split.

## World tick processing — per-world isolation (2026-07)

Processing flags (`isProcessingFlights`, `isProcessingMaintenance`, etc.)
were **global singletons** — a large world (1700+ AI aircraft) blocked all
other worlds from processing flights, maintenance, and revenue. Fixed:

- **Per-world state** via `_wp(worldId)`: each world has its own busy
  flags and throttle timestamps so they can't starve each other.
- **Missing throttle intervals** (`recallCheckInterval`,
  `reputationCheckInterval`, `notificationCheckInterval`) were never
  defined — these ran every tick (1s) instead of every 30–60s.
- **Membership ID cache** (`_getMembershipIds`): 30s TTL, replaces 6+
  identical `WorldMembership.findAll` queries per tick cycle.
- **Adaptive intervals** (`_interval`): worlds with more airlines get
  proportionally longer intervals (1×–3× scaling) to prevent DB overload.
- **Batch queries** in `processFlights`: all active routes, membership
  attributes, and competitor aircraft pre-loaded once per cycle (3 queries
  vs 100+ per-flight). Competitor lookup by airport-pair key in memory.
  `processReputation` batch-loads fleets + routes (2 queries vs N+N).
- **Connection pool** bumped from 5 → auto-sized (80% of Postgres
  `max_connections`, cap 80). Was the primary bottleneck — 5 connections
  shared between 5 worlds + API requests.

## AI aircraft financing variety (2026-07)

AI airlines now vary how they pay for aircraft instead of always leasing:
**cash / deposit+loan (financed) / lease**, weighted by personality and
affordability (`decideAIAcquisition`, `buildAIFinancePlan`, `createAIFleetLoan`
in `aiDecisionService.js`). Reuses the existing `Loan` machinery —
`processLoanPayments` already deducts AI loan repayments (no `isAI` filter).
Guardrails: leverage caps, deposit+runway check, one loan per bank, ≤3 loans,
assumed AI credit score. Also added real postwar **Goodyear L-class + K-class
airships** (available 1950) via `addPostwarAirships.js`.

## Payments — Stripe credit packs (2026-07)

Real money. Handle with care; test in **test mode** first.

- **Sold as value/time, not "£/credit".** `src/config/billingConfig.js` is the
  single source of truth for the 4 one-time packs (Starter/Popular/Value/
  Ultimate). The `/credits` page (`public/credits.html`) is Steam/Nitro-style
  cards + a **display-only currency dropdown** (live FX via `/api/billing/fx`,
  cached, GBP fallback) that **always charges GBP** and says so.
- **Stripe Checkout (hosted).** `POST /api/billing/checkout` → inline
  `price_data` + `invoice_creation` → hosted page → back to `/credits`.
  Credits are **global** (`User.credits`).
- **Webhook** `POST /api/billing/webhook` **must be mounted BEFORE
  `express.json()`** (raw body for signature check) — it is, in `server.js`.
  Fulfils `checkout.session.completed` idempotently: grants credits, stores
  invoice/receipt URLs. `Payment` model + `payments` table (auto-created on
  boot; additive `ALTER … IF NOT EXISTS` for `refunded_at`, `credit_note_url`).
- **Admin invoices/refunds** (user Actions → Invoices): approve/deny pending,
  **refund** (real Stripe refund + credit clawback + issues a **Credit Note**
  = the customer's "refund invoice"). Admin sees the full trail (Invoice ·
  Credit Note · Receipt).
- **Dormant until keys set.** Needs env: `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `APP_URL`. Test-mode uses the Stripe CLI
  (`stripe listen`) for the `whsec_`; live uses a dashboard webhook endpoint
  at `https://ams.ceo/api/billing/webhook`. Keys live in `.env` / Railway vars,
  **never committed**.
- **Pricing caveat (open):** credits burn per *game* week, so at 60× a full
  1950→2020 world ≈ 3,650 credits ≈ £1,600+ / ~£30/real-week — likely too
  expensive; a consumption redesign (charge per real time, or CEO Plus
  subscription for upkeep) is the recommended next step.

## Admin 2FA — TOTP step-up (2026-07)

- **Authy-compatible TOTP** (`otplib` **v12** — NOT v13, whose API is a
  breaking rewrite; `qrcode` for the QR). Step-up: you log in normally, then a
  code is required to open the **admin panel**, verified once per session.
- `requireAdmin` (in `middleware/auth.js`) enforces it when `user.totpEnabled`
  and `!req.session.adminTwoFA`, **exempting `/api/admin/2fa/*`** so setup/
  verify stay reachable. Routes in `src/routes/admin2fa.js`
  (status/setup/enable/verify/disable), mounted **before** `/api/admin`.
- User columns `totp_secret / totp_enabled / totp_backup_codes` (additive
  ALTER guards). **Backup codes** at enrol + **DB escape hatch**
  (`totp_enabled=false`) so you can't get locked out. Secrets are per-account,
  so live enrolment is separate from the sandbox.

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
- **Commit/push only when explicitly asked** ("commit and push" / "push").
  Then commit on `main` and `git push origin main` — **no feature branches**
  (his stated workflow: push to main to stay in sync). Split into logical
  commits; **keep `.claude/settings.local.json` (has secrets) out**. Don't
  proactively commit/push after a fix — he reviews in the running app first.
- **DO commit `package-lock.json` — especially when dependencies change.**
  Railway builds with `npm ci`, which fails if `package.json` and
  `package-lock.json` are out of sync ("Missing: <pkg> from lock file").
  The old "keep package-lock out" rule broke a deploy on 2026-07 after adding
  `stripe`; superseded. `node_modules/` is partially tracked (legacy) but
  gitignored for new files — that's fine, `npm ci` rebuilds it.
- **Syntax-check after edits** (`node -c`), and sanity-test logic with a small
  harness when behaviour matters (e.g. the LHR–GVA ski litmus test).
- **Track multi-step work with TodoWrite.** Keep one item in progress.
- **Match the surrounding code style** (this codebase is CommonJS, vanilla JS,
  no framework — ignore the editor's "convert to ESM" hint).
- The user maintains a persistent memory (`MEMORY.md` + files) — durable
  project facts/decisions live there; offer to update it after notable work
  rather than assuming.
