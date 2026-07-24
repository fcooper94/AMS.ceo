/**
 * Prune Service (Scaling Phase 5 — data discipline)
 *
 * Keeps the fastest-growing tables bounded so thousands of persistent worlds
 * stay affordable on a single Postgres. Runs on the SIM role only, once per
 * real day (plus once ~10 min after boot), in bounded batches so it never
 * holds long locks or blocks tick processing. PRUNE=0 disables entirely.
 *
 * Retention policy (agreed 2026-07-24):
 *   • Notifications — read >30 game-days old, or any >120 game-days old
 *   • weekly_financials — keep 5 game-years (260 weeks) per airline
 *   • Loans — non-active (paid_off/defaulted) gone 1 game-year after the
 *     last payment (fallback: 30 real days if no payment date)
 *   • Dead worlds (status='completed', >30 real days) — gameplay data fully
 *     purged; the worlds row and world_memberships survive as a record
 *
 * All cutoffs that are game-time based join through world_memberships →
 * worlds and compare against that world's own clock ("current_time"), so
 * every world prunes correctly at its own era — never wall-clock for
 * game-time data (per-world era scoping rule).
 */

const sequelize = require('../config/database');

const BATCH = 5000;        // max rows per DELETE statement
const MAX_LOOPS = 40;      // safety valve per rule per run (200K rows/day cap)

class PruneService {
  constructor() {
    this.intervalMs = 24 * 60 * 60 * 1000; // daily
    this.bootDelayMs = 10 * 60 * 1000;     // first run 10 min after boot
    this._timer = null;
    this._running = false;
  }

  get enabled() {
    return process.env.PRUNE !== '0';
  }

  start() {
    if (this._timer || !this.enabled) return;
    if (process.env.SIM_AUTOSTART === '0') return; // sim role only
    setTimeout(() => {
      this.runAll().catch(e => console.error('[PRUNE] boot run failed:', e.message));
    }, this.bootDelayMs);
    this._timer = setInterval(() => {
      this.runAll().catch(e => console.error('[PRUNE] daily run failed:', e.message));
    }, this.intervalMs);
    console.log('[PRUNE] scheduler active (daily; first run in 10 min; PRUNE=0 disables)');
  }

  /**
   * Delete in bounded batches until a batch comes back short (or the safety
   * valve trips). `sql` must contain a LIMIT :batch inside an id-subquery.
   */
  async _batchedDelete(label, sql) {
    let total = 0;
    try {
      for (let i = 0; i < MAX_LOOPS; i++) {
        const [, meta] = await sequelize.query(sql, { replacements: { batch: BATCH } });
        const deleted = meta?.rowCount ?? 0;
        total += deleted;
        if (deleted < BATCH) break;
      }
      if (total > 0) console.log(`[PRUNE] ${label}: ${total} rows`);
    } catch (e) {
      console.error(`[PRUNE] ${label} failed:`, e.message);
    }
    return total;
  }

  async runAll() {
    if (this._running) return;
    this._running = true;
    const t0 = Date.now();
    try {
      // ── 1. Notifications (game-time keyed per world) ──
      await this._batchedDelete('notifications', `
        DELETE FROM notifications WHERE id IN (
          SELECT n.id FROM notifications n
          JOIN world_memberships wm ON wm.id = n.world_membership_id
          JOIN worlds w ON w.id = wm.world_id
          WHERE (n.is_read = true AND n.game_time < w."current_time" - INTERVAL '30 days')
             OR n.game_time < w."current_time" - INTERVAL '120 days'
          LIMIT :batch
        )`);

      // ── 2. Weekly financials: keep 260 game-weeks (5 game-years) ──
      await this._batchedDelete('weekly_financials', `
        DELETE FROM weekly_financials WHERE id IN (
          SELECT f.id FROM weekly_financials f
          JOIN world_memberships wm ON wm.id = f.world_membership_id
          JOIN worlds w ON w.id = wm.world_id
          WHERE f.week_start < (w."current_time" - INTERVAL '260 weeks')::date
          LIMIT :batch
        )`);

      // ── 3. Finished loans: 1 game-year after the last payment ──
      // last_payment_game_date is a 'YYYY-MM-DD' string; NULLIF guards empty
      await this._batchedDelete('loans', `
        DELETE FROM loans WHERE id IN (
          SELECT l.id FROM loans l
          JOIN world_memberships wm ON wm.id = l.world_membership_id
          JOIN worlds w ON w.id = wm.world_id
          WHERE l.status <> 'active'
            AND (
              NULLIF(l.last_payment_game_date, '')::date < (w."current_time" - INTERVAL '1 year')::date
              OR (NULLIF(l.last_payment_game_date, '') IS NULL AND l.updated_at < NOW() - INTERVAL '30 days')
            )
          LIMIT :batch
        )`);

      // ── 4. Dead worlds: purge gameplay data 30 real days after completion.
      // worlds row + world_memberships survive as a record. Child tables
      // first (FK order), all scoped via the dead worlds' membership ids.
      const deadMembers = `SELECT id FROM world_memberships WHERE world_id IN
        (SELECT id FROM worlds WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '30 days')`;
      const deadWorldTables = [
        ['dead-world scheduled_flights', `
          DELETE FROM scheduled_flights WHERE id IN (
            SELECT sf.id FROM scheduled_flights sf
            JOIN routes r ON r.id = sf.route_id
            WHERE r.world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world recurring_maintenance', `
          DELETE FROM recurring_maintenance WHERE id IN (
            SELECT rm.id FROM recurring_maintenance rm
            JOIN user_aircraft ua ON ua.id = rm.aircraft_id
            WHERE ua.world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world sightseeing_tours', `
          DELETE FROM sightseeing_tours WHERE id IN (
            SELECT id FROM sightseeing_tours WHERE world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world marketing_campaigns', `
          DELETE FROM marketing_campaigns WHERE id IN (
            SELECT id FROM marketing_campaigns WHERE world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world routes', `
          DELETE FROM routes WHERE id IN (
            SELECT id FROM routes WHERE world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world user_aircraft', `
          DELETE FROM user_aircraft WHERE id IN (
            SELECT id FROM user_aircraft WHERE world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world pricing_defaults', `
          DELETE FROM pricing_defaults WHERE id IN (
            SELECT id FROM pricing_defaults WHERE world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world notifications', `
          DELETE FROM notifications WHERE id IN (
            SELECT id FROM notifications WHERE world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world weekly_financials', `
          DELETE FROM weekly_financials WHERE id IN (
            SELECT id FROM weekly_financials WHERE world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world loans', `
          DELETE FROM loans WHERE id IN (
            SELECT id FROM loans WHERE world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world airspace_restrictions', `
          DELETE FROM airspace_restrictions WHERE id IN (
            SELECT id FROM airspace_restrictions WHERE world_membership_id IN (${deadMembers}) LIMIT :batch)`],
        ['dead-world used_aircraft_for_sale', `
          DELETE FROM used_aircraft_for_sale WHERE id IN (
            SELECT id FROM used_aircraft_for_sale WHERE world_id IN
              (SELECT id FROM worlds WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '30 days')
            LIMIT :batch)`]
      ];
      for (const [label, sql] of deadWorldTables) {
        await this._batchedDelete(label, sql);
      }

      console.log(`[PRUNE] run complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } finally {
      this._running = false;
    }
  }
}

module.exports = new PruneService();
