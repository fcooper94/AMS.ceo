# AMS.ceo Scaling Plan — 1,000 players, thousands of 24/7 worlds

**Written:** 2026-07-24 · **Status:** planned, not started (Phase 0 complete)

## Target load

- ~1,000 registered players
- 2–3 singleplayer worlds each → **2,000–3,000 SP worlds**, all persistent ("24/7")
- Every player in 1–2 multiplayer worlds → **~20–60 MP worlds**, always populated
- Assume ~5% concurrent players → **~50 users / ~100–150 "hot" worlds** at any moment

## Core principle: hot/cold worlds

**"Runs 24/7" means the world's time always advances — NOT that it is processed
every second.** At 60×, one game-week elapses in ~2.8 real hours. A world nobody
is looking at can be processed in one batched pass every 30–60 real minutes and
the outcome is indistinguishable from live ticking when the player returns.

- **Hot world** — a human is online in it, or it's an MP world: fine-grained
  processing (today's behaviour).
- **Cold world** — SP world, owner offline: batch window-processing on a coarse
  timer. Thousands of cold worlds cost roughly what a handful of hot ones do.

This single idea is what makes 3,000 worlds affordable. Everything else is
plumbing to support it.

---

## Phases (each ships value on its own)

### Phase 0 — single-process perf (DONE, 2026-07-24)
Raw-row cycle caches, per-cycle membership object, raw maintenance processing,
`(status, day_of_week)` index, event-loop stall monitor + `[TICK-SLOW]` phase
timing, boot warming gate. Result: no steady-state event-loop stalls at
5-world scale. **The stall monitor is the tripwire for starting Phase 3.**

### Phase 1 — window-based engine refactor — CODE COMPLETE 2026-07-24 (harness-tested, pending live verify)

Shipped as `worldTimeService.processWorldWindow(worldId, {toGameTime, include,
stateless})` + `worlds.last_processed_at` (additive guard). Day walk settles
flights/tours per elapsed game day (23:59 synthetic timestamps; route-day
keys make it idempotent), credits at each crossed Monday 00:05, weeklies at
week boundaries (TZ-stable noon week-keys, shared maps with legacy dispatch);
maintenance completions run once at window end (already due-based, 90-day
lookback); catch-up/cold passes add stateless processors once at end with AI
scaled 1 round per elapsed game-week (max 4). Anchor stamps after EVERY
settled day (mid-pass crash never replays a day — lastRevenueGameDay only
remembers the last date, replay would double-credit). 4-game-week cap per
pass. Hot ticks call it with tiny windows on the flight cadence; boot
catch-up settles the offline gap (deploys used to silently skip it).
**Rollback: `WINDOW_ENGINE=0`** reverts to the legacy throttle dispatch,
which keeps the anchor current via the tick's periodic write so re-enabling
never double-settles. Bonus fix both paths: pre-1970 worlds never got the
daily maintenance refresh (negative epoch day vs `|| 0` default).

Original design notes:
- Revenue already keys off `lastRevenueGameDay` per route — generalise: a
  window pass walks each elapsed game-day and settles flights/tours due in it.
- Same for maintenance completions, weekly overheads/loans/deliveries (already
  week-keyed), AI decision cadence (N decisions per elapsed game-week),
  listings/recalls.
- Hot worlds call the same code with tiny windows — ONE code path, two cadences.
- Cap catch-up windows (e.g. max 4 game-weeks per pass) so a long-dead world
  doesn't hitch the worker; long gaps just take a few passes.
- **Determinism note:** window passes must not double-settle — every settler
  needs an idempotence key like `lastRevenueGameDay` (most already have one).

### Phase 2 — hot/cold scheduling (still one process)
- `worlds.temperature` derived, not stored: hot = MP, or any member's
  `lastSeen` within ~15 min (an in-memory presence map fed by the heartbeat
  endpoint already exists: `onlineUsers`).
- Scheduler loop: hot worlds every few seconds; cold worlds queued round-robin,
  each processed every 30–60 real min.
- Ship this while still on ONE service — at current world counts it simply
  makes the process near-idle, and it proves the window engine.

### Phase 3 — split web / sim (two services)
Trigger: steady-state `EVENT-LOOP STALL` returns, or before the player-count
push. Groundwork already exists (`SIM_AUTOSTART`).
- **ams-web**: `SIM_AUTOSTART=0`. No warm-up gate needed (still loads the
  demand cache for the route picker).
- **ams-sim**: `SIM_AUTOSTART=1`, no public traffic.
- **Redis becomes required** (see topology): Socket.IO pub/sub so sim-emitted
  events reach players connected to web, AND the session store —
  express-session currently uses MemoryStore, which doesn't survive restarts
  or multiple web instances. Use `connect-redis` + `@socket.io/redis-adapter`.

### Phase 3 — ✅ DEPLOYED to Railway 2026-07-24 (runbook kept for reference/rollback)

Verified in production: sim ticks worlds and emits via Redis, web serves the
mirrored clock, no steady-state event-loop stalls on either service (the 49s
demand-cache stall at boot now lands on the sim, where it's harmless).
Two lessons from the deploy:
- **`ams-sim` needs the web service's FULL variable set** (raw-editor copy,
  then flip `SIM_AUTOSTART=1`) — it boots the same `server.js`. Any future
  env var added to web must be added to sim too (or moved to Shared
  Variables).
- VATSIM OAuth env is no longer required to boot: the passport strategy is
  registered only when `VATSIM_CLIENT_ID`/`SECRET` are set (f1181b6).

The code side is done: Redis Socket.IO adapter (web) + emitter (sim role),
DB time mirror for web-role `getCurrentTime()` (15s refresh, extrapolated
from `last_tick_at`), sim reconciler (15s: starts worlds created on web,
applies pause/resume/accel from DB, stops deleted ones), web-role
`startWorld()` no-op. No `REDIS_URL` → identical single-process behaviour.

**To deploy the split on Railway (exact UI steps):**
0. Push this code and wait for the deploy to go GREEN before touching env
   vars (behaviour is unchanged while combined — the split only activates
   via the vars below).
1. **+ New → Database → Redis** in the project. Copy its `REDIS_URL` —
   prefer the private/internal one (`redis.railway.internal`) if offered.
2. Existing `ams` service → Variables → add:
   `REDIS_URL = <step 1>` and `SIM_AUTOSTART = 0`. It redeploys as web-only.
   From this moment world time is FROZEN (nobody ticking) — expected; move
   to step 3 promptly. Logs must show "Simulation skipped — this server is
   UI/API only" and "DB time mirror active".
3. **+ New → GitHub Repo → fcooper94/AMS.ceo** (same repo), name `ams-sim`.
   Variables: `DATABASE_URL = <same as web>`, `REDIS_URL = <step 1>`,
   `SIM_AUTOSTART = 1`. Do NOT generate a public domain (Settings →
   Networking: leave unexposed). Logs must show worlds starting/ticking.
4. Verify (~2 min): world clock advances in the browser (proves the Redis
   bridge end-to-end); pause a world from the UI → sim logs pick it up
   within ~15s; web logs stay free of EVENT-LOOP STALL while sim churns.

**Rollback:** delete/stop `ams-sim`, remove `SIM_AUTOSTART` from the web
service (unset = combined mode), redeploy.

### Phase 4 — sharded sim workers
Trigger: one sim worker can't hold all hot worlds + cold queue.
- Workers claim worlds via a **DB lease**: `worlds.assigned_worker` +
  `worker_heartbeat_at`; claim = atomic UPDATE where lease is null/stale.
  Crashed workers' worlds get re-claimed automatically.
- Hot worlds weighted so they spread across workers; cold queue is split by
  claim. Scaling = duplicate the worker service in Railway.
- **DB pool budgeting becomes mandatory**: replace the "80% of
  max_connections" auto-size with a `DB_POOL_MAX` env per service
  (e.g. web 60, each worker 40; keep total < 400 of the 500).

### Phase 5 — data discipline (parallel, ongoing)
- ✅ **SP AI cap: 200 airlines** (was ~740; changed 2026-07-24). Spawn tiers
  concentrate them at the top ~100 airports by type + traffic, with region
  weights keeping UK/US/EU hubs densest. Existing worlds unaffected (spawn is
  creation-time only).
- Aggressive pruning everywhere on the maintenance-prune model: old
  notifications, completed loans, stale weekly_financials, completed worlds.
- Row budget at target scale (3K worlds × ~80 AI × ~4 aircraft ≈ 1M aircraft,
  ~2M routes, maintenance pruned to horizon) — fine for single Postgres, but
  only WITH pruning and the world-scoped indexes.

---

## Railway topology

### Today
| Resource | Role |
|---|---|
| `ams` service | web + sim in one Node process |
| Postgres | everything |

### Target
| Resource | Phase | Role / notes |
|---|---|---|
| **ams-web** (existing service, renamed role) | 3 | Public HTTP + Socket.IO. `SIM_AUTOSTART=0`. Scale to 2+ replicas only after sessions move to Redis. |
| **ams-sim-1 … ams-sim-N** (new, same repo/image) | 3–4 | World processing. `SIM_AUTOSTART=1`, `WORKER_ID=<n>`. Start with one; add replicas as hot-world count grows. No public domain. |
| **Postgres** (existing) | — | Single primary stays. Watch connections (pool budgeting) and disk (pruning). Read replica only if reporting/analytics ever need it — not for the sim. |
| **Redis** (new) | 3 | Socket.IO adapter + session store + (optional) presence map. Smallest tier is fine. |

**Explicitly NOT needed:** a second Postgres / split databases (bottleneck is
Node CPU, never was the DB; splitting costs joins/FKs for nothing), a message
queue (the DB lease + Redis pub/sub cover coordination at this scale).

### Env additions along the way
- `SIM_AUTOSTART` (exists) — web `0`, sim `1`
- `DB_POOL_MAX` (Phase 4) — per-service pool cap
- `REDIS_URL` (Phase 3)
- `WORKER_ID` (Phase 4)
- `WARMUP_SECONDS` (exists) — only meaningful on sim-less web if kept at 0

### Rough cost shape
Today ≈ 1 service + 1 DB. Target ≈ web + 1–3 sim workers + Redis + the same
Postgres — order of 2–4× current infra cost at full scale, scaling roughly
with hot worlds (i.e. with actual concurrent players), NOT with total worlds.
That's the property that makes 3,000 worlds viable.

---

## Decision log
- **2026-07-24** Hot/cold + window processing chosen over "tick everything
  24/7" (which would need ~50+ workers) and over "pause worlds entirely"
  (user wants worlds genuinely advancing while away).
- Databases stay single Postgres; Redis added only when processes split.
