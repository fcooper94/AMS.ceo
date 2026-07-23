const World = require('../models/World');
const { WorldMembership, User, ScheduledFlight, Route, UserAircraft, Aircraft, RecurringMaintenance, Notification } = require('../models');
const { Op } = require('sequelize');
const { calculateFlightDurationMs } = require('../utils/flightCalculations');
const path = require('path');
const { STORAGE_AIRPORTS } = require(path.join(__dirname, '../../public/js/storageAirports.js'));
const { CARGO_TYPES, CARGO_TYPE_KEYS, migrateOldConfig, migrateOldRates, defaultCargoRates } = require('../config/cargoTypes');

// Verbose per-tick simulation logs (maintenance checks, template revenue,
// refresh progress) are gated behind DEBUG_SIM to keep the console readable.
const DEBUG_SIM = process.env.DEBUG_SIM === '1' || process.env.DEBUG_SIM === 'true';
const simLog = (...args) => { if (DEBUG_SIM) console.log(...args); };

/**
 * World Time Service
 * Manages the continuous progression of game time with acceleration for multiple worlds
 */
class WorldTimeService {
  constructor() {
    this.tickRate = 1000; // Update every 1 second (real time)
    this.worlds = new Map(); // Map of worldId -> { world, tickInterval, inMemoryTime, lastTickAt }
    // Throttle heavy DB queries to reduce load on remote databases
    // Per-world processing state so a slow world doesn't starve others
    this._worldProcessing = new Map(); // worldId -> { lastCreditCheck, lastFlightCheck, ... }
    this.lastMaintenanceRefresh = {}; // Map of worldId -> last game week refreshed
    this.lastMaintenancePruneDay = {}; // Map of worldId -> last game date completed-record prune ran
    this.creditCheckInterval = 30000; // Check credits every 30 seconds (real time)
    this.flightCheckInterval = 5000; // Check flights every 5 seconds (real time)
    this.maintenanceCheckInterval = 10000; // Check maintenance every 10 seconds (real time)
    this.listingCheckInterval = 60000; // Check listings every 60 seconds (real time)
    this.recallCheckInterval = 30000; // Check recalls every 30 seconds (real time)
    this.reputationCheckInterval = 60000; // Recalculate reputation every 60 seconds (real time)
    this.notificationCheckInterval = 30000; // Emit notification refresh every 30 real seconds
    this.lastLeaseIncomeWeek = {}; // Map of worldId -> last game week processed for lease/storage income
    // AI decision processing
    this.lastAICheck = 0;
    this.aiCheckInterval = 30000; // Check AI decisions every 30 seconds (real time)
    this.isProcessingAI = false;
    // AI flight templates repeat weekly - no refresh needed
    // Notification refresh via Socket.IO
    this.lastNotificationDayEmitted = {}; // Map of worldId -> last game day where daily notification was emitted
    // Weekly overhead recording
    this.lastOverheadWeek = {}; // Map of worldId -> last game week (Monday date) overheads were recorded
    // Marketing boost cache — Map<membershipId, boostPct> cleared at start of each flight-check cycle
    this.marketingBoostCache = new Map();
    // Weekly loan payment processing
    this.lastLoanWeek = {}; // Map of worldId -> last game week loans were processed
    // Weekly aircraft delivery processing
    this.lastDeliveryWeek = {};
    // Membership ID cache: avoids re-querying every 5s per processing function
    this._membershipCache = new Map(); // worldId -> { ids: [...], expiry: timestamp }
    this._membershipCacheTTL = 30000; // 30 seconds
  }

  /**
   * Get cached active membership IDs for a world. Refreshed every 30s.
   * Called by every processing function — avoids 6+ identical queries per tick cycle.
   */
  async _getMembershipIds(worldId) {
    const cached = this._membershipCache.get(worldId);
    if (cached && Date.now() < cached.expiry) return cached.ids;
    const memberships = await WorldMembership.findAll({
      where: { worldId, isActive: true },
      attributes: ['id']
    });
    const ids = memberships.map(m => m.id);
    this._membershipCache.set(worldId, { ids, expiry: Date.now() + this._membershipCacheTTL });
    this._updateIntervalScale(worldId, ids.length);
    return ids;
  }

  /**
   * Get per-world processing state (throttle timestamps + busy flags).
   * Each world gets its own state so a slow world can't starve others.
   * Intervals scale with world size — a world with 50 AI airlines doesn't
   * need to check flights every 5s when processing takes 10s+.
   */
  _wp(worldId) {
    let s = this._worldProcessing.get(worldId);
    if (!s) {
      s = {
        lastCreditCheck: 0, isProcessingCredits: false,
        lastFlightCheck: 0, isProcessingFlights: false,
        lastMaintenanceCheck: 0, isProcessingMaintenance: false,
        isRefreshingMaintenance: false,
        lastListingCheck: 0, isProcessingListings: false,
        lastNotificationCheck: 0,
        lastRecallCheck: 0, isProcessingRecalls: false,
        lastReputationCheck: 0, isProcessingReputation: false,
        isProcessingOverheads: false,
        isProcessingLoans: false,
        isProcessingDeliveries: false,
        // Adaptive multiplier — set once when memberships are first cached
        intervalScale: 1,
      };
      this._worldProcessing.set(worldId, s);
    }
    return s;
  }

  /**
   * Adaptive interval for a world: base interval × scale factor.
   * Scale is based on membership count (proxy for world complexity).
   * 1-5 memberships: 1x, 10: 1.5x, 20: 2x, 50+: 3x.
   */
  _interval(baseMs, wp) {
    return Math.round(baseMs * wp.intervalScale);
  }

  /**
   * Update the adaptive scale factor when membership count is known.
   */
  _updateIntervalScale(worldId, membershipCount) {
    const wp = this._wp(worldId);
    // Gentle ramp: 1x up to 5 members, then +0.1x per member, cap at 3x
    wp.intervalScale = Math.min(3, 1 + Math.max(0, membershipCount - 5) * 0.1);
  }

  /**
   * Start time progression for all active worlds
   */
  async startAll() {
    try {
      const activeWorlds = await World.findAll({
        where: { status: 'active' }
      });

      if (activeWorlds.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠ No active worlds found. Create a world first.');
        }
        return false;
      }

      for (const world of activeWorlds) {
        await this.startWorld(world.id);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`✓ World Time Service started for ${activeWorlds.length} world(s)`);
      }

      return true;
    } catch (error) {
      console.error('✗ Failed to start World Time Service:', error.message);
      return false;
    }
  }

  /**
   * Start time progression for a specific world
   */
  async startWorld(worldId) {
    try {
      // Don't start if already running
      if (this.worlds.has(worldId)) {
        return true;
      }

      const world = await World.findByPk(worldId);
      if (!world || world.status !== 'active') {
        return false;
      }

      const now = new Date();

      // Calculate catch-up time: time that passed while server was off
      // Skip catch-up if world was paused
      let catchUpTime = new Date(world.currentTime);
      if (world.lastTickAt && !world.isPaused) {
        const realTimeSinceLastTick = (now.getTime() - world.lastTickAt.getTime()) / 1000; // seconds
        const gameTimeToAdd = realTimeSinceLastTick * world.timeAcceleration; // seconds
        catchUpTime = new Date(world.currentTime.getTime() + (gameTimeToAdd * 1000));

        if (process.env.NODE_ENV === 'development') {
          const minutesOffline = Math.round(realTimeSinceLastTick / 60);
          const gameHoursAdded = Math.round(gameTimeToAdd / 3600);
          console.log(`  Catching up ${minutesOffline} min offline → +${gameHoursAdded} game hours`);
        }
      } else if (world.isPaused) {
        console.log(`  World "${world.name}" is paused - skipping catch-up`);
      }

      // Check if caught-up time has passed the end date
      if (world.endDate) {
        const endDate = new Date(world.endDate);
        if (catchUpTime >= endDate) {
          catchUpTime = endDate;
          console.log(`World "${world.name}" ended while server was offline. Marking as completed.`);

          await world.sequelize.query(
            'UPDATE worlds SET "current_time" = :currentTime, "last_tick_at" = :lastTickAt, "status" = :status, "updated_at" = :updatedAt WHERE id = :worldId',
            {
              replacements: {
                currentTime: catchUpTime,
                lastTickAt: now,
                status: 'completed',
                updatedAt: now,
                worldId: world.id
              }
            }
          );
          world.status = 'completed';
          return false; // Don't start the tick loop
        }
      }

      // Update database with caught-up time
      await world.sequelize.query(
        'UPDATE worlds SET "current_time" = :currentTime, "last_tick_at" = :lastTickAt WHERE id = :worldId',
        {
          replacements: {
            currentTime: catchUpTime,
            lastTickAt: now,
            worldId: world.id
          }
        }
      );

      // Update the world object's currentTime to match
      world.currentTime = catchUpTime;

      // Store world state in memory with caught-up time
      const worldState = {
        world: world,
        inMemoryTime: catchUpTime,
        lastTickAt: now,
        tickInterval: null
      };

      this.worlds.set(worldId, worldState);

      // Start the tick loop for this world
      worldState.tickInterval = setInterval(() => this.tick(worldId), this.tickRate);

      if (process.env.NODE_ENV === 'development') {
        console.log(`✓ Started world: ${world.name} (${world.timeAcceleration}x)`);
      }

      return true;
    } catch (error) {
      console.error(`✗ Failed to start world ${worldId}:`, error.message);
      return false;
    }
  }

  /**
   * Stop time progression for a specific world
   */
  stopWorld(worldId) {
    const worldState = this.worlds.get(worldId);
    if (worldState && worldState.tickInterval) {
      clearInterval(worldState.tickInterval);
      this.worlds.delete(worldId);
      if (process.env.NODE_ENV === 'development') {
        console.log(`✓ Stopped world: ${worldState.world.name}`);
      }
    }
  }

  /**
   * Stop all worlds
   */
  async stopAll() {
    // Save final state for all worlds before stopping
    const savePromises = [];
    for (const [worldId, worldState] of this.worlds.entries()) {
      if (worldState.tickInterval) {
        clearInterval(worldState.tickInterval);
      }

      // Save final time to database
      const now = new Date();
      savePromises.push(
        worldState.world.sequelize.query(
          'UPDATE worlds SET "current_time" = :currentTime, "last_tick_at" = :lastTickAt WHERE id = :worldId',
          {
            replacements: {
              currentTime: worldState.inMemoryTime,
              lastTickAt: now,
              worldId: worldId
            }
          }
        )
      );
    }

    // Wait for all saves to complete
    await Promise.all(savePromises);

    this.worlds.clear();
    if (process.env.NODE_ENV === 'development') {
      console.log('✓ World Time Service stopped all worlds and saved final state');
    }
  }

  /**
   * Main tick function - advances game time for a specific world
   */
  async tick(worldId) {
    const worldState = this.worlds.get(worldId);
    if (!worldState) return;

    const { world, inMemoryTime, lastTickAt } = worldState;

    try {
      // Check if world should be operating
      if (world.isPaused) {
        return;
      }

      // Auto-pause a singleplayer world once the owner's session has gone quiet
      // (no client heartbeat within the timeout). Opt-in via pauseOnSessionEnd.
      if (world.pauseOnSessionEnd && world.worldType === 'singleplayer' && world.status === 'active' && world.lastActiveAt) {
        const SESSION_PAUSE_TIMEOUT_MS = 90 * 1000;
        const idleMs = Date.now() - new Date(world.lastActiveAt).getTime();
        if (idleMs > SESSION_PAUSE_TIMEOUT_MS) {
          console.log(`[AUTO-PAUSE] "${world.name}" idle ${Math.round(idleMs / 1000)}s — pausing (session ended).`);
          await this.pauseWorld(worldId);
          return;
        }
      }

      const now = new Date();
      const realElapsedSeconds = (now.getTime() - lastTickAt.getTime()) / 1000;

      // Calculate game time advancement (in seconds)
      const gameTimeAdvancement = realElapsedSeconds * world.timeAcceleration;

      // Update in-memory time
      let newGameTime = new Date(inMemoryTime.getTime() + (gameTimeAdvancement * 1000));

      // Check if world has reached its end date
      if (world.endDate) {
        const endDate = new Date(world.endDate);
        if (newGameTime >= endDate) {
          // Clamp to end date and stop the world
          newGameTime = endDate;
          worldState.inMemoryTime = newGameTime;
          worldState.lastTickAt = now;

          console.log(`World "${world.name}" has reached its end date (${endDate.toISOString()}). Stopping.`);

          // Update DB: set final time and mark as completed
          await world.sequelize.query(
            'UPDATE worlds SET "current_time" = :currentTime, "last_tick_at" = :lastTickAt, "status" = :status, "updated_at" = :updatedAt WHERE id = :worldId',
            {
              replacements: {
                currentTime: newGameTime,
                lastTickAt: now,
                status: 'completed',
                updatedAt: now,
                worldId: world.id
              }
            }
          );
          world.status = 'completed';

          // Stop the tick interval
          this.stopWorld(worldId);
          return;
        }
      }

      worldState.inMemoryTime = newGameTime;
      worldState.lastTickAt = now;

      // Save to database every 10 seconds to reduce DB load
      const shouldSave = Math.floor(now.getTime() / 10000) !== Math.floor(lastTickAt.getTime() / 10000);

      if (shouldSave) {
        await world.sequelize.query(
          'UPDATE worlds SET "current_time" = :currentTime, "last_tick_at" = :lastTickAt, "updated_at" = :updatedAt WHERE id = :worldId',
          {
            replacements: {
              currentTime: newGameTime,
              lastTickAt: now,
              updatedAt: now,
              worldId: world.id
            }
          }
        );
      }

      // Emit tick event for other systems to react
      this.onTick(worldId, newGameTime, gameTimeAdvancement);

    } catch (error) {
      console.error(`World tick error (${world.name}):`, error.message);
    }
  }

  /**
   * Hook for other systems to react to time progression
   */
  onTick(worldId, gameTime, advancementSeconds) {
    // Emit via Socket.IO if available
    if (global.io) {
      const worldState = this.worlds.get(worldId);
      global.io.emit('world:tick', {
        worldId: worldId,
        gameTime: gameTime.toISOString(),
        advancement: advancementSeconds,
        timeAcceleration: worldState ? worldState.world.timeAcceleration : 60
      });
    }

    const now = Date.now();
    const wp = this._wp(worldId); // per-world processing state

    // Check for credit deductions (throttled to reduce DB load)
    if (!wp.isProcessingCredits && now - wp.lastCreditCheck >= this._interval(this.creditCheckInterval, wp)) {
      wp.lastCreditCheck = now;
      wp.isProcessingCredits = true;
      this.processCredits(worldId, gameTime)
        .catch(err => console.error('Error processing credits:', err.message))
        .finally(() => { wp.isProcessingCredits = false; });
    }

    // Process flight statuses (throttled to reduce DB load)
    if (!wp.isProcessingFlights && now - wp.lastFlightCheck >= this._interval(this.flightCheckInterval, wp)) {
      wp.lastFlightCheck = now;
      wp.isProcessingFlights = true;
      // Clear marketing boost cache at the start of each flight-check cycle so it's fresh per cycle
      this.marketingBoostCache.clear();
      this.processFlights(worldId, gameTime)
        .catch(err => console.error('Error processing flights:', err.message))
        .finally(() => { wp.isProcessingFlights = false; });
    }

    // Process maintenance checks (throttled to reduce DB load)
    if (!wp.isProcessingMaintenance && now - wp.lastMaintenanceCheck >= this._interval(this.maintenanceCheckInterval, wp)) {
      wp.lastMaintenanceCheck = now;
      wp.isProcessingMaintenance = true;
      this.processMaintenance(worldId, gameTime)
        .catch(err => console.error('Error processing maintenance:', err.message))
        .finally(() => { wp.isProcessingMaintenance = false; });
    }

    // Refresh auto-scheduled maintenance once per game day
    // This ensures daily checks never expire (they have ~1-2 day validity)
    const gameDay = Math.floor(gameTime.getTime() / (24 * 60 * 60 * 1000));
    const lastRefreshDay = this.lastMaintenanceRefresh[worldId] || 0;
    if (!wp.isRefreshingMaintenance && gameDay > lastRefreshDay) {
      this.lastMaintenanceRefresh[worldId] = gameDay;
      wp.isRefreshingMaintenance = true;
      this.refreshMaintenanceSchedules(worldId)
        .catch(err => console.error('Error refreshing maintenance schedules:', err.message))
        .finally(() => { wp.isRefreshingMaintenance = false; });
    }

    // Process aircraft listings (NPC buyers/lessees) and lease-out income
    if (!wp.isProcessingListings && now - wp.lastListingCheck >= this._interval(this.listingCheckInterval, wp)) {
      wp.lastListingCheck = now;
      wp.isProcessingListings = true;
      this.processListings(worldId, gameTime)
        .catch(err => console.error('Error processing listings:', err.message))
        .finally(() => { wp.isProcessingListings = false; });
    }

    // Process aircraft recall completions (recalling -> active)
    if (!wp.isProcessingRecalls && now - wp.lastRecallCheck >= this._interval(this.recallCheckInterval, wp)) {
      wp.lastRecallCheck = now;
      wp.isProcessingRecalls = true;
      this.processRecalls(worldId, gameTime)
        .catch(err => console.error('Error processing recalls:', err.message))
        .finally(() => { wp.isProcessingRecalls = false; });
    }

    // Process AI airline decisions (SP worlds only)
    if (!this.isProcessingAI && now - this.lastAICheck >= this.aiCheckInterval) {
      this.lastAICheck = now;
      this.isProcessingAI = true;
      const aiDecisionService = require('./aiDecisionService');
      aiDecisionService.processAIDecisions(worldId, gameTime)
        .catch(err => console.error('Error processing AI decisions:', err.message))
        .finally(() => { this.isProcessingAI = false; });
    }

    // Recalculate airline reputation scores
    if (!wp.isProcessingReputation && now - wp.lastReputationCheck >= this._interval(this.reputationCheckInterval, wp)) {
      wp.lastReputationCheck = now;
      wp.isProcessingReputation = true;
      this.processReputation(worldId, gameTime)
        .catch(err => console.error('Error processing reputation:', err.message))
        .finally(() => { wp.isProcessingReputation = false; });
    }

    // Record weekly overhead costs (staff, leases, contractors) once per game week
    const WeeklyFinancial = require('../models/WeeklyFinancial');
    const currentWeekStart = WeeklyFinancial.getWeekStart(gameTime);
    const lastOverheadWeek = this.lastOverheadWeek[worldId] || '';
    if (!wp.isProcessingOverheads && currentWeekStart !== lastOverheadWeek) {
      this.lastOverheadWeek[worldId] = currentWeekStart;
      wp.isProcessingOverheads = true;
      this.recordWeeklyOverheads(worldId, gameTime, currentWeekStart)
        .catch(err => console.error('Error recording weekly overheads:', err.message))
        .finally(() => { wp.isProcessingOverheads = false; });
    }

    // Process weekly loan payments once per game week
    const lastLoanWeek = this.lastLoanWeek[worldId] || '';
    if (!wp.isProcessingLoans && currentWeekStart !== lastLoanWeek) {
      this.lastLoanWeek[worldId] = currentWeekStart;
      wp.isProcessingLoans = true;
      this.processLoanPayments(worldId, gameTime)
        .catch(err => console.error('Error processing loan payments:', err.message))
        .finally(() => { wp.isProcessingLoans = false; });
    }

    // Process aircraft deliveries once per game week
    const lastDeliveryWeek = this.lastDeliveryWeek[worldId] || '';
    if (!wp.isProcessingDeliveries && currentWeekStart !== lastDeliveryWeek) {
      this.lastDeliveryWeek[worldId] = currentWeekStart;
      wp.isProcessingDeliveries = true;
      this.processDeliveries(worldId, gameTime)
        .catch(err => console.error('Error processing deliveries:', err.message))
        .finally(() => { wp.isProcessingDeliveries = false; });
    }

    // AI flight schedules no longer need refresh - templates repeat weekly automatically

    // Emit notification refresh signal (throttled to every 30 real seconds)
    // Picks up computed notification changes from processing cycles above
    if (global.io && now - wp.lastNotificationCheck >= this.notificationCheckInterval) {
      wp.lastNotificationCheck = now;
      global.io.emit('notifications:refresh', { worldId: worldId });
    }

    // Emit notification refresh at 00:01 game time each day for persistent notifications
    const lastNotifDay = this.lastNotificationDayEmitted[worldId] || 0;
    if (global.io && gameDay > lastNotifDay) {
      const hour = gameTime.getHours();
      const minute = gameTime.getMinutes();
      if (hour === 0 && minute >= 1) {
        this.lastNotificationDayEmitted[worldId] = gameDay;
        global.io.emit('notifications:refresh', { worldId: worldId });
      }
    }
  }

  /**
   * Process credit deductions for all active memberships in a world
   * Credits are deducted every Monday at 00:01 game time (per-world weeklyCost)
   */
  async processCredits(worldId, currentGameTime) {
    const worldState = this.worlds.get(worldId);
    if (!worldState) return;

    const gameTime = new Date(currentGameTime);
    const dayOfWeek = gameTime.getDay(); // 0 = Sunday, 1 = Monday
    const hour = gameTime.getHours();
    const minute = gameTime.getMinutes();

    // Only process on Monday between 00:01 and 00:10 game time
    // (10 minute window to ensure we catch it with the tick interval)
    if (dayOfWeek !== 1 || hour !== 0 || minute < 1 || minute > 10) {
      return;
    }

    // Get the weekly cost from the world settings (default 1)
    const weeklyCost = worldState.world.weeklyCost !== undefined ? worldState.world.weeklyCost : 1;

    if (weeklyCost <= 0) return; // No cost for this world

    try {
      // Get all active memberships for this world
      const memberships = await WorldMembership.findAll({
        where: {
          worldId: worldId,
          isActive: true
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'credits', 'unlimitedCredits']
        }]
      });

      // Get the Monday at 00:01 timestamp for this week (for comparison)
      const thisMondayMorning = new Date(gameTime);
      thisMondayMorning.setHours(0, 1, 0, 0);

      for (const membership of memberships) {
        // Check if we already processed this Monday
        const lastDeduction = membership.lastCreditDeduction ? new Date(membership.lastCreditDeduction) : null;

        // Skip if still in free period (lastCreditDeduction set to future game date on join)
        if (lastDeduction && lastDeduction > thisMondayMorning) {
          continue;
        }

        // Skip if we already deducted this Monday (compare dates, not exact times)
        if (lastDeduction) {
          const lastDeductionDate = lastDeduction.toISOString().split('T')[0];
          const todayDate = thisMondayMorning.toISOString().split('T')[0];
          if (lastDeductionDate === todayDate) {
            continue; // Already processed this Monday
          }
        }

        // Deduct weekly cost credits (skip unlimited users)
        if (membership.user) {
          if (membership.user.unlimitedCredits) {
            // Update last deduction time but don't deduct credits
            membership.lastCreditDeduction = thisMondayMorning;
            await membership.save();
            continue;
          }
          membership.user.credits -= weeklyCost;
          await membership.user.save();

          // Update last deduction time to this Monday
          membership.lastCreditDeduction = thisMondayMorning;
          await membership.save();

          if (process.env.NODE_ENV === 'development') {
            console.log(`[Monday 00:01] Deducted ${weeklyCost} credit(s) from user ${membership.user.id} for world ${worldState.world.name}. New balance: ${membership.user.credits}`);
          }

          // Check if user has fallen below -4 (enter administration)
          if (membership.user.credits < -4) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`User ${membership.user.id} has entered administration (credits: ${membership.user.credits})`);
            }
            // TODO: Implement administration logic (sell assets, etc.)
          }
        }
      }
    } catch (error) {
      console.error('Error processing credits:', error);
    }
  }

  /**
   * Process flight revenue for weekly templates
   * Templates repeat every week - no status transitions needed.
   * Revenue is credited once per game day per route using lastRevenueGameDay tracking.
   */
  async processFlights(worldId, currentGameTime) {
    const worldState = this.worlds.get(worldId);
    if (!worldState) return;

    try {
      // Get all memberships for this world (cached, refreshed every 30s)
      const membershipIds = await this._getMembershipIds(worldId);
      if (membershipIds.length === 0) return;

      const gameDate = currentGameTime.toISOString().split('T')[0]; // YYYY-MM-DD
      const gameDayOfWeek = currentGameTime.getDay(); // 0=Sun, 6=Sat
      const gameHours = currentGameTime.getHours();
      const gameMinutes = currentGameTime.getMinutes();
      const currentMinutesOfDay = gameHours * 60 + gameMinutes;

      // ── Pre-load caches for this flight-check cycle ──────────────────────
      // These replace the per-flight N+1 queries in processFlightRevenue:
      // competing routes, membership attributes, and competitor aircraft.
      // Loaded once, passed via this._flightCycleCache, cleared after the cycle.

      // All active routes in this world (for competitor lookups by airport pair)
      const allActiveRoutes = await Route.findAll({
        where: { worldMembershipId: { [Op.in]: membershipIds }, isActive: true },
        attributes: ['id', 'departureAirportId', 'arrivalAirportId', 'economyPrice',
          'worldMembershipId', 'assignedAircraftId', 'cargoRates']
      });
      // Key by "depId|arrId" (both directions) for O(1) competitor lookup
      const routesByPair = new Map();
      for (const r of allActiveRoutes) {
        const k1 = `${r.departureAirportId}|${r.arrivalAirportId}`;
        const k2 = `${r.arrivalAirportId}|${r.departureAirportId}`;
        if (!routesByPair.has(k1)) routesByPair.set(k1, []);
        routesByPair.get(k1).push(r);
        if (k1 !== k2) {
          if (!routesByPair.has(k2)) routesByPair.set(k2, []);
          routesByPair.get(k2).push(r);
        }
      }

      // All membership attributes (reputation, contractor tiers, isAI)
      const allMemberships = await WorldMembership.findAll({
        where: { worldId, isActive: true },
        attributes: ['id', 'reputation', 'isAI', 'cleaningContractor', 'groundContractor']
      });
      const membershipAttrMap = new Map(allMemberships.map(m => [m.id, m]));

      // All assigned aircraft with cargo/condition data (for competitor scoring)
      const allAssignedAcIds = [...new Set(allActiveRoutes.map(r => r.assignedAircraftId).filter(Boolean))];
      let competitorAcMap = {};
      if (allAssignedAcIds.length > 0) {
        const allCompAircraft = await UserAircraft.findAll({
          where: { id: { [Op.in]: allAssignedAcIds } },
          attributes: ['id', 'ageYears', 'conditionPercentage', 'cargoConfig',
            'cargoLightKg', 'cargoStandardKg', 'cargoHeavyKg'],
          include: [{ model: Aircraft, as: 'aircraft', attributes: ['type'] }]
        });
        competitorAcMap = Object.fromEntries(allCompAircraft.map(a => [a.id, a]));
      }

      // Store on instance for processFlightRevenue to read (cleared below)
      this._flightCycleCache = { routesByPair, membershipAttrMap, competitorAcMap };

      // 1. Find same-day templates (depart today, complete today) whose round-trip has finished
      const sameDayTemplates = await ScheduledFlight.findAll({
        where: {
          dayOfWeek: gameDayOfWeek,
          arrivalDayOffset: 0,
          isActive: true
        },
        include: [{
          model: Route,
          as: 'route',
          where: {
            worldMembershipId: { [Op.in]: membershipIds },
            [Op.or]: [
              { lastRevenueGameDay: { [Op.ne]: gameDate } },
              { lastRevenueGameDay: null }
            ]
          },
          include: [
            { model: require('../models/Airport'), as: 'departureAirport' },
            { model: require('../models/Airport'), as: 'arrivalAirport' },
            { model: require('../models/Airport'), as: 'techStopAirport' }
          ]
        }, {
          model: UserAircraft,
          as: 'aircraft',
          include: [{ model: Aircraft, as: 'aircraft' }]
        }]
      });

      for (const template of sameDayTemplates) {
        // Use cached totalDurationMinutes if available, otherwise compute
        const [depH, depM] = template.departureTime.split(':').map(Number);
        const depMinutes = depH * 60 + depM;
        const totalDuration = template.totalDurationMinutes || this.computeTemplateDuration(template);
        const completionMinutes = depMinutes + totalDuration;

        if (currentMinutesOfDay >= completionMinutes) {
          await this.processTemplateRevenue(template, worldId, currentGameTime, gameDate);
        } else if (DEBUG_SIM) {
          simLog(`⏳ Flight ${template.route?.routeNumber || '?'} not yet complete: now=${currentMinutesOfDay}min, completes=${completionMinutes}min (dep=${depMinutes}+dur=${totalDuration})`);
        }
      }

      // 2. Find multi-day templates that departed on previous days and complete today
      for (let offset = 1; offset <= 3; offset++) {
        const pastDow = (gameDayOfWeek - offset + 7) % 7;

        const multiDayTemplates = await ScheduledFlight.findAll({
          where: {
            dayOfWeek: pastDow,
            arrivalDayOffset: offset,
            isActive: true
          },
          include: [{
            model: Route,
            as: 'route',
            where: {
              worldMembershipId: { [Op.in]: membershipIds },
              [Op.or]: [
                { lastRevenueGameDay: { [Op.ne]: gameDate } },
                { lastRevenueGameDay: null }
              ]
            },
            include: [
              { model: require('../models/Airport'), as: 'departureAirport' },
              { model: require('../models/Airport'), as: 'arrivalAirport' },
              { model: require('../models/Airport'), as: 'techStopAirport' }
            ]
          }, {
            model: UserAircraft,
            as: 'aircraft',
            include: [{ model: Aircraft, as: 'aircraft' }]
          }]
        });

        for (const template of multiDayTemplates) {
          // Arrival time is the time on the arrival day
          const [arrH, arrM] = (template.arrivalTime || '23:59:00').split(':').map(Number);
          const arrMinutes = arrH * 60 + arrM;

          if (currentMinutesOfDay >= arrMinutes) {
            await this.processTemplateRevenue(template, worldId, currentGameTime, gameDate);
          }
        }
      }

      // 3. Sightseeing tours (separate model — scenic loops from a base airport)
      await this.processSightseeingTours(worldId, currentGameTime, gameDate, gameDayOfWeek, currentMinutesOfDay, membershipIds);
    } catch (error) {
      console.error('Error processing flights:', error.message);
    } finally {
      this._flightCycleCache = null; // clear per-cycle caches
    }
  }

  /**
   * Process sightseeing-tour revenue. A tour is a scenic round-trip from a base
   * airport; it operates on its daysOfWeek and is credited once per operating
   * game day (lastRevenueGameDay guard) once its departure + duration has passed.
   * Revenue uses a flat, price-driven load: a high baseline softened by how far
   * the ticket price sits above a duration-based suggested price.
   */
  async processSightseeingTours(worldId, currentGameTime, gameDate, gameDayOfWeek, currentMinutesOfDay, membershipIds) {
    try {
      const { SightseeingTour } = require('../models');
      const eraEconomicService = require('./eraEconomicService');
      if (!membershipIds || membershipIds.length === 0) return;

      const tours = await SightseeingTour.findAll({
        where: {
          worldMembershipId: { [Op.in]: membershipIds },
          isActive: true,
          assignedAircraftId: { [Op.ne]: null },
          daysOfWeek: { [Op.contains]: [gameDayOfWeek] },
          [Op.or]: [{ lastRevenueGameDay: { [Op.ne]: gameDate } }, { lastRevenueGameDay: null }]
        },
        include: [{ model: UserAircraft, as: 'assignedAircraft', include: [{ model: Aircraft, as: 'aircraft' }] }]
      });
      if (tours.length === 0) return;

      const worldYear = currentGameTime.getFullYear();
      const fuelMultiplier = eraEconomicService.getFuelCostMultiplier(worldYear);
      const eraMultiplier = eraEconomicService.getEraMultiplier(worldYear);

      for (const tour of tours) {
        const ac = tour.assignedAircraft;
        if (!ac || !ac.aircraft) continue;
        // Don't fly (or earn) while the aircraft is grounded — maintenance, storage, on order, etc.
        if (ac.status && ac.status !== 'active') continue;

        // Gate: departure (default 09:00) + duration must have elapsed today.
        const dep = (tour.scheduledDepartureTime || '09:00').split(':').map(Number);
        const depMinutes = (dep[0] || 0) * 60 + (dep[1] || 0);
        const durationMin = tour.durationMin || Math.max(5, Math.round((parseFloat(tour.distanceNm) || 0) / (ac.aircraft.cruiseSpeed || 200) * 60));
        if (currentMinutesOfDay < depMinutes + durationMin) continue;

        const distance = parseFloat(tour.distanceNm) || 0;
        const price = parseFloat(tour.ticketPrice) || 0;

        // Seats: configured cabin if set, else aircraft capacity.
        const configured = (ac.economySeats || 0) + (ac.economyPlusSeats || 0) + (ac.businessSeats || 0) + (ac.firstSeats || 0);
        const seats = configured > 0 ? configured : (ac.aircraft.passengerCapacity || 0);

        // Flat, price-driven load: 0.9 baseline, softened above a suggested price.
        // Era-scaled so the sweet-spot price matches era-appropriate values (and
        // the builder's hint, which scales the same way).
        const suggested = Math.max(5 * eraMultiplier, durationMin * 3 * eraMultiplier);
        const priceRatio = suggested > 0 ? price / suggested : 1;
        let load = 0.9 - 0.5 * (priceRatio - 1);
        load = Math.max(0.15, Math.min(0.98, load));
        load = Math.max(0.05, Math.min(1, load * (0.95 + Math.random() * 0.10))); // ±5% noise

        const pax = Math.round(seats * load);
        const revenue = Math.round(pax * price);

        // Costs — mirror routes via shared helper. distanceNm is already the full loop.
        const acData = ac.aircraft;
        const { fuelCost, crewCost, maintenanceCost, airportFees, groundHandling,
                paxServiceCost, navCharges, cateringCost, distributionCost, totalCosts } =
          eraEconomicService.calculateFlightCosts(distance, seats, worldYear, pax, {
            fuelBurnPerHour: parseFloat(acData?.fuelBurnPerHour) || 0,
            maintenanceCostPerHour: parseFloat(acData?.maintenanceCostPerHour) || 0,
            cruiseSpeed: parseInt(acData?.cruiseSpeed) || 0,
            requiredPilots: parseInt(acData?.requiredPilots) || 2,
            requiredCabinCrew: parseInt(acData?.requiredCabinCrew) || 0,
            ticketRevenue: revenue
          });
        const profit = revenue - totalCosts;

        // Tour metrics
        const flights = (parseInt(tour.totalFlights) || 0) + 1;
        const avgLF = ((parseFloat(tour.averageLoadFactor) || 0) * (flights - 1) + load * 100) / flights;
        await tour.update({
          totalFlights: flights,
          totalRevenue: (parseFloat(tour.totalRevenue) || 0) + revenue,
          totalCosts: (parseFloat(tour.totalCosts) || 0) + totalCosts,
          totalPassengers: (parseInt(tour.totalPassengers) || 0) + pax,
          averageLoadFactor: Math.round(avgLF * 100) / 100,
          lastRevenueGameDay: gameDate
        });

        // Credit airline balance
        const membership = await WorldMembership.findByPk(tour.worldMembershipId);
        if (membership) {
          membership.balance = (parseFloat(membership.balance) || 0) + profit;
          await membership.save();
        }

        // Weekly financials
        try {
          const WeeklyFinancial = require('../models/WeeklyFinancial');
          const weekStart = WeeklyFinancial.getWeekStart(currentGameTime);
          const [weekRecord] = await WeeklyFinancial.findOrCreate({
            where: { worldMembershipId: tour.worldMembershipId, weekStart }, defaults: {}
          });
          await weekRecord.increment({
            flightRevenue: revenue, fuelCosts: fuelCost, crewCosts: crewCost,
            maintenanceCosts: maintenanceCost, airportFees: airportFees + navCharges,
            groundHandlingCosts: groundHandling,
            paxServiceCosts: paxServiceCost + cateringCost + distributionCost,
            flights: 1, passengers: pax
          });
        } catch (_) { /* non-critical */ }

        // Aircraft flight hours (drives maintenance accrual)
        ac.totalFlightHours = (parseFloat(ac.totalFlightHours) || 0) + (durationMin / 60);
        await ac.save();
      }
    } catch (error) {
      console.error('Error processing sightseeing tours:', error.message);
    }
  }

  /**
   * Compute round-trip duration for a template (fallback when totalDurationMinutes not cached)
   */
  computeTemplateDuration(template) {
    const route = template.route;
    const distanceNm = parseFloat(route.distance) || 500;
    const cruiseSpeed = template.aircraft?.aircraft?.cruiseSpeed || 450;
    const turnaroundMinutes = route.turnaroundTime || 45;

    const depLat = parseFloat(route.departureAirport?.latitude) || 0;
    const depLng = parseFloat(route.departureAirport?.longitude) || 0;
    const arrLat = parseFloat(route.arrivalAirport?.latitude) || 0;
    const arrLng = parseFloat(route.arrivalAirport?.longitude) || 0;

    let totalMs;

    if (route.techStopAirport) {
      const techLat = parseFloat(route.techStopAirport.latitude) || 0;
      const techLng = parseFloat(route.techStopAirport.longitude) || 0;
      const leg1Distance = route.legOneDistance || Math.round(distanceNm * 0.4);
      const leg2Distance = route.legTwoDistance || Math.round(distanceNm * 0.6);
      const techStopMs = 30 * 60 * 1000;
      const turnaroundMs = turnaroundMinutes * 60 * 1000;

      const leg1Ms = calculateFlightDurationMs(leg1Distance, depLng, techLng, depLat, techLat, cruiseSpeed);
      const leg2Ms = calculateFlightDurationMs(leg2Distance, techLng, arrLng, techLat, arrLat, cruiseSpeed);
      const leg3Ms = calculateFlightDurationMs(leg2Distance, arrLng, techLng, arrLat, techLat, cruiseSpeed);
      const leg4Ms = calculateFlightDurationMs(leg1Distance, techLng, depLng, techLat, depLat, cruiseSpeed);

      totalMs = leg1Ms + techStopMs + leg2Ms + turnaroundMs + leg3Ms + techStopMs + leg4Ms;
    } else {
      const outboundMs = calculateFlightDurationMs(distanceNm, depLng, arrLng, depLat, arrLat, cruiseSpeed);
      const returnMs = calculateFlightDurationMs(distanceNm, arrLng, depLng, arrLat, depLat, cruiseSpeed);
      const turnaroundMs = turnaroundMinutes * 60 * 1000;
      totalMs = outboundMs + turnaroundMs + returnMs;
    }

    return Math.round(totalMs / 60000); // Convert ms to minutes
  }

  /**
   * Process revenue for a completed template flight and update route statistics
   */
  async processTemplateRevenue(template, worldId, currentGameTime, gameDate) {
    // Skip revenue for aircraft that aren't actively flying
    const acStatus = template.aircraft?.status;
    if (acStatus && acStatus !== 'active') {
      return;
    }

    // Delegate to the existing processFlightRevenue logic
    await this.processFlightRevenue(template, worldId, currentGameTime);

    // Mark this route as having had revenue processed today
    await template.route.update({ lastRevenueGameDay: gameDate });

    // Record transit check on aircraft
    if (template.aircraft) {
      await template.aircraft.update({ lastTransitCheckDate: currentGameTime });
    }

    simLog(`✓ Template flight ${template.route.routeNumber} revenue processed for ${gameDate}`);
  }

  /**
   * Process revenue for a completed flight
   * Calculates passengers, revenue, costs, and updates route stats + airline balance
   */
  // Deterministic per-flight daily variance in [0,1) — replaces Math.random() so
  // the load factor previewed on the world map (as a flight departs) is exactly
  // the value recorded when its round-trip completes on the same game day.
  _lfSeed(flightId, gameTime) {
    const key = `${flightId}:${gameTime.toISOString().split('T')[0]}`;
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  }

  // When previewOnly is true, computes and returns the sector load factor WITHOUT
  // recording any revenue/stats (used by the world map for airborne flights).
  async processFlightRevenue(flight, worldId, currentGameTime, previewOnly = false) {
    try {
      const route = flight.route;
      if (!route) return previewOnly ? 0.7 : undefined;

      const eraEconomicService = require('./eraEconomicService');
      const aircraft = flight.aircraft;
      const paxCapacity = aircraft?.aircraft?.passengerCapacity || 150;
      const distance = parseFloat(route.distance) || 500;
      const worldYear = currentGameTime.getFullYear();

      // ── Load Factor Model ──
      // finalLF = baseLF × demand × maturity × prestige × price × competition × time × reputation × variance
      let loadFactor = 0.7; // Default fallback
      let competitorCount = 0; // hoisted for yield pressure (used after the try block)
      let myMembershipRef = null; // hoisted for ground handler tier in cost calc
      let routeIsDomestic = false; // hoisted for cargo market era curve (set from demand lookup)
      let routeDemandValue = 50; // hoisted for cargo market sizing (set from demand lookup)
      let routeRouteType = null; // hoisted for cargo seasonal adjustment (set from demand lookup)
      // Competitors' cargo capacity on this pair, for the cargo fair-share split
      // (populated in the competition section below; empty = monopoly). Each entry
      // is { config: {typeKey:kg}, isPax: bool } for a competing route's aircraft.
      let cargoCompetitorAllocs = [];
      try {
        const routeDemandService = require('./routeDemandService');

        // 1. Base load factor ceiling from era (0.65–0.84)
        const baseLF = eraEconomicService.getExpectedLoadFactor(worldYear) / 100;

        // 2. Demand factor: gentle curve — even low-demand routes fill well if right-sized
        //    demand 100 → 1.00, demand 50 → 0.91, demand 35 → 0.87, demand 0 → 0.78
        let demandFactor = 1.0;
        try {
          const routeDemand = await routeDemandService.getRouteDemand(
            route.departureAirportId, route.arrivalAirportId, worldYear
          );
          routeDemandValue = routeDemand.demand;
          routeIsDomestic = routeDemand.isDomestic === true;
          routeRouteType = routeDemand.routeType || null;
          demandFactor = 0.78 + 0.22 * (routeDemandValue / 100);
        } catch (demandErr) {
          // Demand lookup failed, use defaults
        }

        // Apply marketing boost from active campaigns (cached per cycle)
        let routeMarketingBoostPct = 0;
        try {
          const membershipId = route.worldMembershipId;
          if (!this.marketingBoostCache.has(membershipId)) {
            const MarketingCampaign = require('../models/MarketingCampaign');
            const totalBoost = await MarketingCampaign.sum('demand_boost', {
              where: { worldMembershipId: membershipId, isActive: true }
            });
            this.marketingBoostCache.set(membershipId, totalBoost || 0);
          }
          routeMarketingBoostPct = this.marketingBoostCache.get(membershipId) || 0;
          if (routeMarketingBoostPct > 0) {
            demandFactor *= (1 + routeMarketingBoostPct / 100);
          }
        } catch (_) { /* non-critical — skip if error */ }

        // 3. Route maturity factor: computed AFTER competition is known (see below),
        //    since how fast a new route fills depends on demand and rivals.
        let maturityFactor = 1.0;

        // 4. Aircraft prestige factor: newer/right-sized aircraft attract more passengers
        let prestigeFactor = 1.0;
        if (aircraft) {
          // Age bonus: newer aircraft are more attractive
          const acAge = parseFloat(aircraft.ageYears) || 0;
          let ageFactor = 1.0;
          if (acAge <= 3) ageFactor = 1.08;
          else if (acAge <= 8) ageFactor = 1.04;
          else if (acAge <= 15) ageFactor = 1.00;
          else if (acAge <= 25) ageFactor = 0.96;
          else ageFactor = 0.92;

          // Size-fit: penalise oversized aircraft for the route demand
          let sizeFactor = 1.0;
          if (routeDemandValue < 30 && paxCapacity > 200) {
            sizeFactor = 0.92; // Big plane on low-demand route
          } else if (routeDemandValue < 50 && paxCapacity > 300) {
            sizeFactor = 0.90; // Widebody on medium-demand route
          }

          prestigeFactor = ageFactor * sizeFactor;
        }

        // 5. Pricing factor: compares your ticket price to the "fair" market price
        //    Overpricing loses passengers, underpricing gains them
        //    Price sensitivity varies by era and market (developing vs developed)
        let priceFactor = 1.0;
        const myEconomyPrice = parseFloat(route.economyPrice) || 0;
        const fairPrice = eraEconomicService.calculateTicketPrice(distance, worldYear, 'economy');

        if (myEconomyPrice > 0 && fairPrice > 0) {
          const priceRatio = myEconomyPrice / fairPrice; // 1.0 = fair, 2.0 = double, 0.5 = half

          // Era-based price sensitivity: modern travelers are more price-conscious
          // 1950s: luxury travel, less sensitive | 2020s: budget airlines, very sensitive
          let sensitivity = 0.5; // default
          if (worldYear < 1970) sensitivity = 0.25;      // Golden age — price matters less
          else if (worldYear < 1990) sensitivity = 0.35;  // Deregulation starting
          else if (worldYear < 2010) sensitivity = 0.45;  // Growing budget market
          else sensitivity = 0.55;                         // Modern — very price conscious

          // Market adjustment: developing country routes are more price sensitive
          const depCountry = route.departureAirport?.country || '';
          const arrCountry = route.arrivalAirport?.country || '';
          const developedMarkets = ['United States', 'United Kingdom', 'Germany', 'France', 'Japan',
            'Canada', 'Australia', 'Netherlands', 'Switzerland', 'Sweden', 'Norway', 'Denmark',
            'Singapore', 'South Korea', 'Italy', 'Spain', 'Belgium', 'Austria', 'Ireland',
            'Finland', 'New Zealand', 'Luxembourg', 'Iceland', 'Israel', 'UAE'];
          const isDeveloped = developedMarkets.includes(depCountry) || developedMarkets.includes(arrCountry);
          if (!isDeveloped) sensitivity += 0.10; // Developing markets: +10% more price sensitive

          // priceFactor: below fair = bonus, above fair = penalty
          // At fair price (ratio 1.0) → factor 1.0
          // At 50% of fair → factor ~1.25 (cheap flights fill up)
          // At 150% of fair → factor ~0.75 (expensive flights lose passengers)
          // At 200% of fair → factor ~0.50 (way too expensive)
          if (priceRatio <= 1.0) {
            // Underpriced: bonus capped at 1.25
            priceFactor = 1.0 + (1.0 - priceRatio) * sensitivity * 0.5;
            priceFactor = Math.min(1.25, priceFactor);
          } else {
            // Overpriced: steeper penalty
            priceFactor = 1.0 - (priceRatio - 1.0) * sensitivity;
            priceFactor = Math.max(0.35, priceFactor);
          }
        }

        // 6. Competition factor: score-based market share model
        //    Each airline on the route gets a competitive score based on reputation,
        //    pricing, service quality, aircraft quality, and marketing.
        //    Passenger share is proportional to score vs total scores.
        let competitionFactor = 1.0;
        let isAIAirline = false;
        const { getContractor } = require('../data/contractorConfig');

        // Find all competing routes (both directions) on this airport pair
        // Uses pre-loaded cycle cache (3 queries at cycle start vs 100+ per-flight)
        const cache = this._flightCycleCache;
        const pairKey = `${route.departureAirportId}|${route.arrivalAirportId}`;
        const competingRoutesList = cache
          ? (cache.routesByPair.get(pairKey) || []).filter(r => r.worldMembershipId !== route.worldMembershipId)
          : await Route.findAll({
              where: {
                [Op.or]: [
                  { departureAirportId: route.departureAirportId, arrivalAirportId: route.arrivalAirportId },
                  { departureAirportId: route.arrivalAirportId, arrivalAirportId: route.departureAirportId }
                ],
                isActive: true,
                worldMembershipId: { [Op.ne]: route.worldMembershipId }
              },
              attributes: ['economyPrice', 'worldMembershipId', 'assignedAircraftId', 'cargoRates']
            });

        // Load our own membership data (from cycle cache or DB fallback)
        const myMembership = cache
          ? cache.membershipAttrMap.get(route.worldMembershipId)
          : await WorldMembership.findByPk(route.worldMembershipId, {
              attributes: ['id', 'reputation', 'isAI', 'cleaningContractor', 'groundContractor']
            });
        myMembershipRef = myMembership;
        const myRep = parseInt(myMembership?.reputation) || 50;
        isAIAirline = !!myMembership?.isAI;
        const myCleaningTier = myMembership?.cleaningContractor || 'standard';
        const myGroundTier = myMembership?.groundContractor || 'standard';
        const myAcAge = parseFloat(aircraft?.ageYears) || 10;
        const myAcCondition = parseFloat(aircraft?.conditionPercentage) || 80;
        const myHasMarketing = (this.marketingBoostCache?.get(route.worldMembershipId) || 0) > 0;

        // Score helper: combines reputation, pricing, service, aircraft, marketing
        const _compScore = (rep, ecoPrice, fPrice, cleanTier, groundTier, acAge, acCond, hasMkt) => {
          // Reputation: 0-100 → 0.70-1.30
          const repS = 0.70 + (rep / 100) * 0.60;
          // Pricing: cheaper than fair = higher score
          const ratio = fPrice > 0 ? Math.max(0.3, Math.min(3.0, ecoPrice / fPrice)) : 1.0;
          const priceS = Math.max(0.6, Math.min(1.4, 1.5 - ratio * 0.5));
          // Service: avg of cleaning + ground quality (25-95 from contractorConfig)
          const cleanQ = getContractor('cleaning', cleanTier)?.qualityScore || 60;
          const groundQ = getContractor('ground', groundTier)?.qualityScore || 60;
          const serviceS = 0.85 + ((cleanQ + groundQ) / 2 / 100) * 0.30;
          // Aircraft: newer + better condition = higher
          const ageF = Math.max(0, Math.min(1, 1 - acAge / 40));
          const condF = acCond / 100;
          const acS = 0.90 + (ageF * 0.6 + condF * 0.4) * 0.20;
          // Marketing: bonus if active campaign
          const mktS = hasMkt ? 1.15 : 1.0;
          return repS * priceS * serviceS * acS * mktS;
        };

        const myScore = _compScore(myRep, myEconomyPrice, fairPrice, myCleaningTier, myGroundTier, myAcAge, myAcCondition, myHasMarketing);

        competitorCount = competingRoutesList.length;
        if (competitorCount > 0) {
          // Competitor memberships + aircraft: use cycle cache (pre-loaded once)
          const mbrMap = cache
            ? Object.fromEntries([...cache.membershipAttrMap.entries()])
            : Object.fromEntries((await WorldMembership.findAll({
                where: { id: { [Op.in]: [...new Set(competingRoutesList.map(r => r.worldMembershipId))] } },
                attributes: ['id', 'reputation', 'cleaningContractor', 'groundContractor']
              })).map(m => [m.id, m]));

          const acMap = cache
            ? cache.competitorAcMap
            : Object.fromEntries((await UserAircraft.findAll({
                where: { id: { [Op.in]: competingRoutesList.map(r => r.assignedAircraftId).filter(Boolean) } },
                attributes: ['id', 'ageYears', 'conditionPercentage', 'cargoConfig',
                  'cargoLightKg', 'cargoStandardKg', 'cargoHeavyKg'],
                include: [{ model: Aircraft, as: 'aircraft', attributes: ['type'] }]
              })).map(a => [a.id, a]));

          // Cargo fair-share: record each competing route's cargo allocation +
          // whether its aircraft carries passengers (belly-eligible). Freighters
          // (type 'Cargo') tap only the commercial market, not the belly bags.
          for (const cr of competingRoutesList) {
            const ca = cr.assignedAircraftId ? acMap[cr.assignedAircraftId] : null;
            if (!ca) continue;
            const config = ca.cargoConfig
              || migrateOldConfig(ca.cargoLightKg, ca.cargoStandardKg, ca.cargoHeavyKg);
            cargoCompetitorAllocs.push({ config, isPax: (ca.aircraft?.type || '') !== 'Cargo' });
          }

          // Calculate each competitor's score
          let totalCompScore = 0;
          for (const cr of competingRoutesList) {
            const cm = mbrMap[cr.worldMembershipId];
            const ca = cr.assignedAircraftId ? acMap[cr.assignedAircraftId] : null;
            const cScore = _compScore(
              parseInt(cm?.reputation) || 50,
              parseFloat(cr.economyPrice) || fairPrice,
              fairPrice,
              cm?.cleaningContractor || 'standard',
              cm?.groundContractor || 'standard',
              parseFloat(ca?.ageYears) || 10,
              parseFloat(ca?.conditionPercentage) || 80,
              (this.marketingBoostCache?.get(cr.worldMembershipId) || 0) > 0
            );
            totalCompScore += cScore;
          }

          // Market share: my score / total scores, normalized to fair share
          const totalAirlines = 1 + competingRoutesList.length;
          const fairShare = 1 / totalAirlines;
          const myShare = myScore / (myScore + totalCompScore);
          competitionFactor = Math.max(0.30, Math.min(1.60, myShare / fairShare));
        }
        // No competitors → competitionFactor stays 1.0 (monopoly)

        // 6b. Route maturity ramp — how fast a NEW route fills its seats.
        // A route builds its customer base over ~8-12 game-weeks. The speed depends
        // on the market it enters:
        //   • Uncontested + strong demand → fills almost immediately (little ramp)
        //   • Against established rivals   → starts lower and climbs as it establishes
        // Marketing lifts the starting point. This replaces the old flat 0.55 start so
        // a high-demand monopoly route no longer opens with an unrealistically low LF,
        // while a route fighting for share starts modest (never zero) and grows.
        if (route.createdAt) {
          const routeAgeWeeks = (currentGameTime.getTime() - new Date(route.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000);
          const ramp = 1 - Math.exp(-Math.max(0, routeAgeWeeks) / 3); // 0 → ~1 over 8-12wk
          const competitorCount = competingRoutesList.length;
          const demandStrength = Math.max(0, Math.min(1, routeDemandValue / 100));

          let startShare;
          if (competitorCount === 0) {
            // Monopoly: unmet demand fills quickly; stronger demand → higher immediate LF
            startShare = 0.80 + 0.15 * demandStrength; // 0.80–0.95
          } else {
            // Competitive: a new entrant starts lower; more rivals → lower start
            startShare = Math.max(0.40, 0.62 - 0.07 * competitorCount);
          }
          // Marketing accelerates establishment (raises the starting share)
          if (routeMarketingBoostPct > 0) {
            startShare = Math.min(0.95, startShare + Math.min(0.15, (routeMarketingBoostPct / 100) * 0.5));
          }
          maturityFactor = Math.min(1.0, startShare + (1 - startShare) * ramp);
        }

        // 7. Time-of-day factor: antisocial departure times reduce load factor
        //    Estimate local hour from departure airport longitude (15° per hour)
        let timeFactor = 1.0;
        try {
          const depTime = route.scheduledDepartureTime; // "HH:MM" or "HH:MM:SS"
          if (depTime) {
            const [depH, depM] = depTime.split(':').map(Number);
            const depUtcHour = depH + (depM / 60);

            const depLng = parseFloat(route.departureAirport?.longitude) || 0;
            const utcOffset = Math.round(depLng / 15);
            let localHour = (depUtcHour + utcOffset + 24) % 24;

            if (localHour >= 6 && localHour < 10) timeFactor = 1.05;       // Morning peak
            else if (localHour >= 16 && localHour < 20) timeFactor = 1.05;  // Evening peak
            else if (localHour >= 10 && localHour < 16) timeFactor = 1.00;  // Midday
            else if (localHour >= 20 && localHour < 22) timeFactor = 0.95;  // Late evening
            else if (localHour >= 22 || localHour < 4) timeFactor = 0.70;   // Red-eye
            else timeFactor = 0.80;                                          // Early morning 04-06
          }
        } catch (timeErr) {
          // Time calculation failed, use default
        }

        // 8. Deterministic daily variance ±10% (seeded per flight + game day)
        const variance = 0.9 + this._lfSeed(flight.id, currentGameTime) * 0.2;

        // 9. Reputation is now baked into the competitive score (factor 6), no separate multiplier

        // Combine all factors
        loadFactor = baseLF * demandFactor * maturityFactor * prestigeFactor * priceFactor * competitionFactor * timeFactor * variance;
        // AI airlines get a higher floor (0.30) to ensure financial survival — represents
        // established customer base, codeshare traffic, and corporate contracts
        const minLoadFactor = isAIAirline ? 0.30 : 0.15;
        loadFactor = Math.max(minLoadFactor, Math.min(0.98, loadFactor));
      } catch (err) {
        // Load factor calculation failed, use default
      }

      // Preview mode (world map): return the sector LF without recording revenue.
      if (previewOnly) return loadFactor;

      // Calculate passengers and revenue based on actual cabin configuration
      const passengers = Math.round(paxCapacity * loadFactor);
      const economyPrice = parseFloat(route.economyPrice) || 0;
      const economyPlusPrice = parseFloat(route.economyPlusPrice) || economyPrice * 1.3;
      const businessPrice = parseFloat(route.businessPrice) || economyPrice * 2.5;
      const firstPrice = parseFloat(route.firstPrice) || economyPrice * 4;

      // Use actual seat counts from aircraft cabin configuration
      let ecoSeats = parseInt(aircraft?.economySeats) || 0;
      const ecoPlusSeats = parseInt(aircraft?.economyPlusSeats) || 0;
      const bizSeats = parseInt(aircraft?.businessSeats) || 0;
      const firstSeats = parseInt(aircraft?.firstSeats) || 0;
      // No custom cabin config (all AI aircraft, unconfigured player aircraft) →
      // treat the whole cabin as economy. Without this the fare fractions below
      // all collapse to 0 and the flight earns $0 ticket revenue.
      if (ecoSeats + ecoPlusSeats + bizSeats + firstSeats === 0) {
        ecoSeats = paxCapacity;
      }
      const totalSeats = ecoSeats + ecoPlusSeats + bizSeats + firstSeats || paxCapacity;

      // Premium demand cap: only a route-dependent slice of passengers will buy
      // premium cabins (cabinClassService class mix — era/GDP/distance/hub aware;
      // no business class pre-1978, First ~12% of pax in 1950 → ~1% today).
      // Premium seats beyond that demand fill with economy-fare passengers
      // (op-ups) rather than printing premium fares — so an over-premiumed cabin
      // genuinely underearns. Unconfigured/all-economy aircraft (incl. all AI)
      // keep the original proportional path.
      let ticketRevenue, cabinRevenue;
      let premiumCapped = false;
      if (ecoPlusSeats + bizSeats + firstSeats > 0) {
        try {
          const cabinClassService = require('./cabinClassService');
          const mix = cabinClassService.computeClassMixForAirports(
            route.departureAirport, route.arrivalAirport, distance * 1.852, worldYear
          );
          // Demand-limited premium pax (never more than the configured seats)
          const firstPax = Math.min(firstSeats, Math.round(passengers * mix.first / 100));
          const bizPax = Math.min(bizSeats, Math.round(passengers * mix.business / 100));
          const ecoPlusPax = Math.min(ecoPlusSeats, Math.round(passengers * mix.premiumEconomy / 100));
          // Everyone else wants economy; cap at economy seats, overflow op-ups
          // into empty premium seats at the economy fare (beyond that the plane
          // is physically full).
          let remaining = passengers - firstPax - bizPax - ecoPlusPax;
          const ecoPax = Math.max(0, Math.min(ecoSeats, remaining));
          remaining -= ecoPax;
          const emptyPremium = (firstSeats - firstPax) + (bizSeats - bizPax) + (ecoPlusSeats - ecoPlusPax);
          const opUpPax = Math.max(0, Math.min(remaining, emptyPremium));

          cabinRevenue = {
            economy:     Math.round((ecoPax + opUpPax) * economyPrice),
            economyPlus: Math.round(ecoPlusPax * economyPlusPrice),
            business:    Math.round(bizPax * businessPrice),
            first:       Math.round(firstPax * firstPrice)
          };
          ticketRevenue = cabinRevenue.economy + cabinRevenue.economyPlus +
                          cabinRevenue.business + cabinRevenue.first;
          premiumCapped = true;
        } catch (mixErr) {
          // Class-mix computation failed — fall through to proportional split
        }
      }
      if (!premiumCapped) {
        // Distribute passengers proportionally to configured seats
        const ecoFrac = totalSeats > 0 ? ecoSeats / totalSeats : 1;
        const ecoPlusFrac = totalSeats > 0 ? ecoPlusSeats / totalSeats : 0;
        const bizFrac = totalSeats > 0 ? bizSeats / totalSeats : 0;
        const firstFrac = totalSeats > 0 ? firstSeats / totalSeats : 0;

        const avgTicketPrice = (economyPrice * ecoFrac) + (economyPlusPrice * ecoPlusFrac) +
                               (businessPrice * bizFrac) + (firstPrice * firstFrac);
        ticketRevenue = Math.round(passengers * avgTicketPrice);

        // Per-cabin breakdown based on actual seat distribution
        cabinRevenue = {
          economy:     Math.round(passengers * ecoFrac * economyPrice),
          economyPlus: Math.round(passengers * ecoPlusFrac * economyPlusPrice),
          business:    Math.round(passengers * bizFrac * businessPrice),
          first:       Math.round(passengers * firstFrac * firstPrice)
        };
      }

      // Cargo revenue — carried tonnes are CAPPED by the per-type route cargo
      // MARKET (belly bags + commercial freight, mirroring the route-picker modal
      // via cargoDemandService), fair-shared against competitors on the pair, then
      // priced with rate elasticity. Belly bags ride only in passenger aircraft;
      // a pure freighter ('Cargo') taps the commercial market only.
      let cargoRevenue = 0;
      const cargoByType = {};
      let cargoConfig = aircraft?.cargoConfig
        || (aircraft ? migrateOldConfig(aircraft.cargoLightKg, aircraft.cargoStandardKg, aircraft.cargoHeavyKg) : null);
      // Fallback: if cargoConfig is still null but the aircraft has cargo capacity,
      // generate a sensible default (catches AI silent failures, old data, etc.)
      if (!cargoConfig && aircraft?.aircraft) {
        try {
          const { configureCargo } = require('./aiFleetConfigService');
          const generated = configureCargo(aircraft.aircraft);
          if (generated) cargoConfig = generated.cargoConfig;
        } catch (_) { /* no cargo capability or missing module */ }
      }
      let cargoRates = route.cargoRates
        || migrateOldRates(route.cargoLightRate, route.cargoStandardRate, route.cargoHeavyRate);
      // Fallback: if all rates are zero (old route, no rates ever set), use era-scaled
      // defaults so cargo revenue is neither inflated nor absent.
      if (!cargoRates || CARGO_TYPE_KEYS.every(k => !(parseFloat(cargoRates[k]) > 0))) {
        const eraMult = eraEconomicService.getEraMultiplier(worldYear);
        cargoRates = defaultCargoRates(eraMult);
      }

      if (cargoConfig) {
        const cargoDemandService = require('./cargoDemandService');
        const { computeAirportCargoDemand } = require('./airportCargoService');
        const seasonalityService = require('./seasonalityService');

        // 1. Route daily cargo market (kg): route pax market × dest cargo character.
        //    Seasonal adjustment: blend between summer/winter demand based on game month.
        //    Cosine curve: peak summer = July (month 6), peak winter = January (month 0).
        let cargoDemand = routeDemandValue;
        try {
          const seasonal = seasonalityService.computeSeasonal(
            route.departureAirport, route.arrivalAirport, routeDemandValue, routeRouteType, worldYear
          );
          const gameMonth = currentGameTime.getMonth(); // 0-11
          const summerBlend = (1 + Math.cos(Math.PI * (gameMonth - 6) / 6)) / 2; // 0=winter, 1=summer
          cargoDemand = seasonal.winter * (1 - summerBlend) + seasonal.summer * summerBlend;
        } catch (_) { /* archetype lookup failed, use annual demand */ }
        const routePax = cargoDemandService.demandToPax(cargoDemand, worldYear, routeIsDomestic);
        const cargoProfile = route.arrivalAirport
          ? computeAirportCargoDemand(route.arrivalAirport, worldYear) : {};
        const market = cargoDemandService.routeCargoMarket({ routePax, year: worldYear, cargoProfile });

        // 2. Belly bags (General) ride only in passenger aircraft.
        const myCarriesPax = (aircraft?.aircraft?.type || '') !== 'Cargo' && passengers > 0;
        const tappable = {};
        for (const typeKey of CARGO_TYPE_KEYS) tappable[typeKey] = market.commercialByType[typeKey] || 0;
        if (myCarriesPax) tappable.general += market.bellyGeneral;

        // Distance modifier: short haul (<500nm) 0.80, medium 1.0, long (>2000nm) 1.15
        const distanceModifier = distance < 500 ? 0.80
          : distance > 2000 ? 1.15
          : 0.80 + 0.20 * ((distance - 500) / 1500);
        const eraMult = eraEconomicService.getEraMultiplier(worldYear);

        for (const typeKey of CARGO_TYPE_KEYS) {
          const allocatedKg = cargoConfig[typeKey] || 0;
          const rate = parseFloat(cargoRates[typeKey]) || 0;
          if (allocatedKg <= 0 || rate <= 0) continue;

          // 3. Fair-share: my allocation vs total allocated on the pair for this
          //    type. Undersupplied market → everyone carries their full allocation;
          //    oversupplied → each route gets a proportional slice.
          let offered = allocatedKg;
          for (const comp of cargoCompetitorAllocs) offered += (comp.config?.[typeKey] || 0);
          const share = offered > 0 ? allocatedKg / offered : 0;
          let carriedKg = Math.min(allocatedKg, (tappable[typeKey] || 0) * share);
          if (carriedKg <= 0) continue;

          // 4. Rate elasticity: over-priced cargo sells less (era-scaled benchmark).
          const benchmark = (CARGO_TYPES[typeKey].defaultRate || rate) * eraMult;
          const priceRatio = benchmark > 0 ? rate / benchmark : 1.0;
          const sellThrough = priceRatio <= 1.0
            ? Math.min(1.15, 1.0 + (1.0 - priceRatio) * 0.30)
            : Math.max(0.25, 1.0 - (priceRatio - 1.0) * 0.60);
          carriedKg = Math.min(allocatedKg, carriedKg * sellThrough);

          const variance = 0.90 + Math.random() * 0.20; // ±10%
          const typeRevenue = Math.round((carriedKg / 1000) * rate * distanceModifier * variance);
          cargoRevenue += typeRevenue;
          if (typeRevenue > 0) cargoByType[typeKey] = typeRevenue;
        }
        cargoRevenue = Math.round(cargoRevenue);
      }

      // Yield pressure: competitive routes push average fares down as passengers
      // shop between airlines. ~3% per competitor, floor 0.88 (4+ competitors).
      const yieldFactor = competitorCount === 0 ? 1.0
        : Math.max(0.88, 1.0 - competitorCount * 0.03);
      const adjustedTicketRevenue = Math.round(ticketRevenue * yieldFactor);

      const totalRevenue = adjustedTicketRevenue + cargoRevenue;

      // Calculate costs — aircraft-specific when data available, else seat-based fallback.
      const acType = aircraft?.aircraft;
      const { fuelCost, crewCost, maintenanceCost, airportFees, groundHandling,
              paxServiceCost, navCharges, cateringCost, distributionCost, totalCosts } =
        eraEconomicService.calculateFlightCosts(distance * 2, paxCapacity, worldYear, passengers, {
          fuelBurnPerHour: parseFloat(acType?.fuelBurnPerHour) || 0,
          maintenanceCostPerHour: parseFloat(acType?.maintenanceCostPerHour) || 0,
          cruiseSpeed: parseInt(acType?.cruiseSpeed) || 0,
          requiredPilots: parseInt(acType?.requiredPilots) || 2,
          requiredCabinCrew: parseInt(acType?.requiredCabinCrew) || 0,
          groundTier: myMembershipRef?.groundContractor || 'standard',
          ticketRevenue: adjustedTicketRevenue
        });

      const profit = totalRevenue - totalCosts;

      // Update route statistics
      const routeFlights = (parseInt(route.totalFlights) || 0) + 1;
      const routeRevenue = (parseFloat(route.totalRevenue) || 0) + totalRevenue;
      const routeCosts = (parseFloat(route.totalCosts) || 0) + totalCosts;
      const routePax = (parseInt(route.totalPassengers) || 0) + passengers;
      const routeAvgLF = routeFlights > 0
        ? ((parseFloat(route.averageLoadFactor) || 0) * (routeFlights - 1) + loadFactor) / routeFlights
        : loadFactor;

      await route.update({
        totalFlights: routeFlights,
        totalRevenue: routeRevenue,
        totalCosts: routeCosts,
        totalPassengers: routePax,
        averageLoadFactor: Math.round(routeAvgLF * 100) / 100
      });

      // Credit/debit airline balance
      const membership = await WorldMembership.findByPk(route.worldMembershipId);
      if (membership) {
        membership.balance = (parseFloat(membership.balance) || 0) + profit;
        await membership.save();
      }

      // Record to weekly financials
      try {
        const WeeklyFinancial = require('../models/WeeklyFinancial');
        const weekStart = WeeklyFinancial.getWeekStart(currentGameTime);
        const [weekRecord] = await WeeklyFinancial.findOrCreate({
          where: { worldMembershipId: route.worldMembershipId, weekStart },
          defaults: {}
        });
        await weekRecord.increment({
          flightRevenue: totalRevenue,
          fuelCosts: fuelCost,
          crewCosts: crewCost,
          maintenanceCosts: maintenanceCost,
          airportFees: airportFees + navCharges,
          groundHandlingCosts: groundHandling,
          paxServiceCosts: paxServiceCost + cateringCost + distributionCost,
          flights: 1,
          passengers: passengers
        });

        // Merge per-cabin and per-cargo breakdown into JSONB columns
        await weekRecord.reload();
        const pb = weekRecord.passengerRevenueBreakdown || {};
        const cb = weekRecord.cargoRevenueBreakdown || {};
        await weekRecord.update({
          passengerRevenueBreakdown: {
            economy:     (pb.economy     || 0) + cabinRevenue.economy,
            economyPlus: (pb.economyPlus || 0) + cabinRevenue.economyPlus,
            business:    (pb.business    || 0) + cabinRevenue.business,
            first:       (pb.first       || 0) + cabinRevenue.first
          },
          cargoRevenueBreakdown: Object.fromEntries(
            CARGO_TYPE_KEYS.map(k => [k, (cb[k] || 0) + (cargoByType[k] || 0)])
          )
        });
      } catch (wfErr) {
        // Non-critical — don't break revenue processing
      }

      // Update aircraft flight hours
      if (aircraft) {
        const flightHours = (distance * 2 / (aircraft.aircraft?.cruiseSpeed || 450));
        aircraft.totalFlightHours = (parseFloat(aircraft.totalFlightHours) || 0) + flightHours;
        await aircraft.save();
      }
    } catch (error) {
      console.error(`Error processing flight revenue for route ${flight.route?.routeNumber || flight.route?.id || '?'}:`, error.message, error.stack?.split('\n').slice(0, 3).join(' '));
    }
  }

  /**
   * Record weekly overhead costs (staff, leases, contractors) for all memberships
   * Called once per game week. Records weekly overhead costs for all memberships.
   */
  async recordWeeklyOverheads(worldId, gameTime, weekStart) {
    try {
      const eraEconomicService = require('./eraEconomicService');
      const { computeStaffRoster } = require('../data/staffConfig');
      const { getContractor } = require('../data/contractorConfig');
      const WeeklyFinancial = require('../models/WeeklyFinancial');

      const world = await World.findByPk(worldId);
      if (!world) return;
      const gameYear = gameTime.getFullYear();
      const eraMultiplier = eraEconomicService.getEraMultiplier(gameYear);

      const memberships = await WorldMembership.findAll({
        where: { worldId, isActive: true }
      });

      // Fleet commonality cost tiers (weekly, 2024 USD, before era scaling)
      const TYPE_FAMILY_WEEKLY_COST = { 'Regional': 5800, 'Narrowbody': 9250, 'Widebody': 15000, 'Cargo': 15000 };
      const LARGE_WIDEBODY_MODELS = ['747', 'A380', '777'];
      const LARGE_WIDEBODY_WEEKLY_COST = 19650;

      for (const membership of memberships) {
        try {
          // Fleet count (include Aircraft type info for commonality calculation)
          const fleet = await UserAircraft.findAll({
            where: { worldMembershipId: membership.id, status: 'active' },
            include: [{ model: Aircraft, as: 'aircraft', attributes: ['manufacturer', 'model', 'type'] }]
          });
          const fleetCount = fleet.length;

          // Lease costs
          const leaseCosts = fleet
            .filter(a => a.acquisitionType === 'lease')
            .reduce((sum, a) => sum + (parseFloat(a.leaseWeeklyPayment) || 0), 0);

          // Staff costs (simplified — no crew-from-routes for overhead snapshot)
          const modifiers = membership.staffSalaryModifiers || {};
          const roster = computeStaffRoster(fleetCount, gameYear, modifiers, {});
          let staffCost = 0;
          for (const dept of roster.departments) {
            for (const role of dept.roles) {
              staffCost += Math.round(role.adjustedSalary * eraMultiplier) * role.count;
            }
          }

          // Contractor costs
          const cleaningCost = (getContractor('cleaning', membership.cleaningContractor || 'standard')?.weeklyCost2024 || 0) * eraMultiplier;
          const groundCost = (getContractor('ground', membership.groundContractor || 'standard')?.weeklyCost2024 || 0) * eraMultiplier;
          const engineeringCost = (getContractor('engineering', membership.engineeringContractor || 'standard')?.weeklyCost2024 || 0) * eraMultiplier;
          const contractorCost = Math.round(cleaningCost + groundCost + engineeringCost);

          // Fleet commonality costs — fixed weekly cost per unique type family
          const typeFamilies = new Map(); // family key → { type, model }
          for (const ac of fleet) {
            if (!ac.aircraft) continue;
            const familyKey = `${ac.aircraft.manufacturer} ${ac.aircraft.model}`;
            if (!typeFamilies.has(familyKey)) {
              typeFamilies.set(familyKey, { type: ac.aircraft.type, model: ac.aircraft.model });
            }
          }
          let commonalityCost = 0;
          for (const [, info] of typeFamilies) {
            const isLargeWidebody = LARGE_WIDEBODY_MODELS.includes(info.model);
            const weeklyCost = isLargeWidebody ? LARGE_WIDEBODY_WEEKLY_COST : (TYPE_FAMILY_WEEKLY_COST[info.type] || 9250);
            commonalityCost += weeklyCost * eraMultiplier;
          }

          // Corporate overhead: insurance + admin that scales with airline size.
          // Insurance: per aircraft per week (hull + liability).
          // Corporate admin: base HQ cost + per-route + per-aircraft (covers IT,
          // reservations, legal, accounting, HR). Creates margin pressure that
          // grows with the airline — prevents infinite scaling.
          const routeCount = await Route.count({
            where: { worldMembershipId: membership.id, isActive: true }
          });
          const insuranceCost = Math.round(fleetCount * 2000 * eraMultiplier);
          const corporateAdminCost = Math.round((5000 + routeCount * 500 + fleetCount * 1000) * eraMultiplier);

          // All values are now weekly — no proration needed
          const [record] = await WeeklyFinancial.findOrCreate({
            where: { worldMembershipId: membership.id, weekStart },
            defaults: {}
          });

          if (!record.overheadRecorded) {
            // Charge active marketing campaign costs and auto-expire finished campaigns
            let marketingCost = 0;
            try {
              const MarketingCampaign = require('../models/MarketingCampaign');
              const currentDateStr = gameTime.toISOString().split('T')[0];
              const activeCampaigns = await MarketingCampaign.findAll({
                where: { worldMembershipId: membership.id, isActive: true }
              });
              for (const campaign of activeCampaigns) {
                if (campaign.gameEndDate && campaign.gameEndDate <= currentDateStr) {
                  await campaign.update({ isActive: false });
                } else {
                  marketingCost += parseFloat(campaign.weeklyBudget) || 0;
                }
              }
            } catch (_) { /* non-critical — skip on error */ }

            await record.update({
              staffCosts: Math.round(staffCost),
              leaseCosts: Math.round(leaseCosts),
              contractorCosts: Math.round(contractorCost),
              fleetCommonalityCosts: Math.round(commonalityCost),
              insuranceCosts: Math.round(insuranceCost),
              corporateAdminCosts: Math.round(corporateAdminCost),
              marketingCosts: Math.round(marketingCost),
              overheadRecorded: true
            });

            // Deduct all overhead + marketing costs from airline balance
            const totalOverheads = Math.round(staffCost) + Math.round(leaseCosts) + Math.round(contractorCost) + Math.round(commonalityCost) + Math.round(insuranceCost) + Math.round(corporateAdminCost) + Math.round(marketingCost);
            if (totalOverheads > 0) {
              await membership.decrement('balance', { by: totalOverheads });
            }
          }
        } catch (mErr) {
          // Skip individual membership errors
        }
      }
    } catch (error) {
      console.error('Error recording weekly overheads:', error.message);
    }
  }

  /**
   * Process weekly loan payments for all active loans in a world
   * Called once per game week. Deducts payments from balance, updates loan state.
   */
  async processLoanPayments(worldId, gameTime) {
    try {
      const Loan = require('../models/Loan');
      const WeeklyFinancial = require('../models/WeeklyFinancial');
      const Notification = require('../models/Notification');
      const { getBank } = require('../data/bankConfig');

      const memberships = await WorldMembership.findAll({
        where: { worldId, isActive: true }
      });

      const gameDate = gameTime.toISOString().split('T')[0];
      const weekStart = WeeklyFinancial.getWeekStart(gameTime);

      for (const membership of memberships) {
        try {
          const loans = await Loan.findAll({
            where: { worldMembershipId: membership.id, status: 'active' }
          });

          if (loans.length === 0) continue;

          let totalPaymentThisWeek = 0;

          for (const loan of loans) {
            try {
              // Idempotent per game week: skip a loan already paid this week.
              // The in-memory lastLoanWeek gate above resets on every server
              // restart (frequent under nodemon in dev), which previously let a
              // loan be charged again on each restart — draining/"paying off" a
              // loan in a few real hours. lastPaymentGameDate is persisted, so
              // this guard survives restarts. Both are 'YYYY-MM-DD' strings, so
              // a lexicographic compare is chronological.
              if (loan.lastPaymentGameDate && loan.lastPaymentGameDate >= weekStart) {
                continue;
              }

              const remaining = parseFloat(loan.remainingPrincipal) || 0;
              if (remaining <= 0) {
                loan.status = 'paid_off';
                loan.weeksRemaining = 0;
                await loan.save();
                continue;
              }

              const annualRate = parseFloat(loan.interestRate) || 0;
              const weeklyRate = annualRate / 100 / 52;
              const weeklyInterest = remaining * weeklyRate;

              // Payment holiday: accrue interest, skip payment
              if (loan.isOnHoliday) {
                loan.remainingPrincipal = remaining + weeklyInterest;
                loan.isOnHoliday = false;
                loan.weeksRemaining = Math.max(0, loan.weeksRemaining - 1);
                loan.lastPaymentGameDate = gameDate;
                await loan.save();
                continue;
              }

              let payment = 0;
              let principalPortion = 0;
              let interestPortion = weeklyInterest;

              if (loan.repaymentStrategy === 'fixed') {
                payment = parseFloat(loan.weeklyPayment) || 0;
                principalPortion = payment - interestPortion;
                // On final months, adjust to avoid overpaying
                if (principalPortion > remaining) {
                  principalPortion = remaining;
                  payment = principalPortion + interestPortion;
                }
              } else if (loan.repaymentStrategy === 'reducing') {
                principalPortion = parseFloat(loan.principalAmount) / loan.termWeeks;
                if (principalPortion > remaining) principalPortion = remaining;
                payment = principalPortion + interestPortion;
              } else {
                // Interest only — pay interest each month, balloon on final month
                if (loan.weeksRemaining <= 1) {
                  principalPortion = remaining;
                  payment = remaining + interestPortion;
                } else {
                  principalPortion = 0;
                  payment = interestPortion;
                }
              }

              payment = Math.round(payment * 100) / 100;
              principalPortion = Math.round(principalPortion * 100) / 100;
              interestPortion = Math.round(interestPortion * 100) / 100;

              // Check if airline can afford the payment
              const balance = parseFloat(membership.balance) || 0;
              if (balance < payment) {
                loan.missedPayments = (loan.missedPayments || 0) + 1;
                loan.lastPaymentGameDate = gameDate;

                // Default at 3 missed payments
                if (loan.missedPayments >= 3) {
                  loan.status = 'defaulted';
                  // Reputation penalty
                  membership.reputation = Math.max(0, (membership.reputation || 0) - 10);
                  await membership.save();

                  const bank = getBank(loan.bankId);
                  try {
                    await Notification.create({
                      worldMembershipId: membership.id,
                      type: 'loan_defaulted',
                      icon: 'alert-triangle',
                      title: `Loan Defaulted — ${bank?.shortName || loan.bankId}`,
                      message: `Your loan has defaulted after 3 missed payments. Reputation penalty applied.`,
                      link: '/loans',
                      priority: 1,
                      gameTime
                    });
                  } catch (nErr) { /* non-critical */ }
                } else {
                  try {
                    const bank = getBank(loan.bankId);
                    await Notification.create({
                      worldMembershipId: membership.id,
                      type: 'loan_missed_payment',
                      icon: 'alert-circle',
                      title: `Missed Payment — ${bank?.shortName || loan.bankId}`,
                      message: `Insufficient funds for loan payment ($${Math.round(payment).toLocaleString()}). ${3 - loan.missedPayments} missed payment(s) until default.`,
                      link: '/loans',
                      priority: 1,
                      gameTime
                    });
                  } catch (nErr) { /* non-critical */ }
                }

                await loan.save();
                continue;
              }

              // Deduct payment
              membership.balance = balance - payment;
              totalPaymentThisWeek += payment;

              // Update loan
              loan.remainingPrincipal = Math.max(0, remaining - principalPortion);
              loan.totalInterestPaid = (parseFloat(loan.totalInterestPaid) || 0) + interestPortion;
              loan.totalPrincipalPaid = (parseFloat(loan.totalPrincipalPaid) || 0) + principalPortion;
              loan.weeksRemaining = Math.max(0, loan.weeksRemaining - 1);
              loan.missedPayments = 0; // Reset on successful payment
              loan.lastPaymentGameDate = gameDate;

              // Check if paid off
              if (loan.remainingPrincipal <= 0.01 || loan.weeksRemaining <= 0) {
                loan.status = 'paid_off';
                loan.remainingPrincipal = 0;
                loan.weeksRemaining = 0;

                const bank = getBank(loan.bankId);
                try {
                  await Notification.create({
                    worldMembershipId: membership.id,
                    type: 'loan_paid_off',
                    icon: 'check-circle',
                    title: `Loan Paid Off — ${bank?.shortName || loan.bankId}`,
                    message: `Your loan has been fully repaid. Total interest paid: $${Math.round(parseFloat(loan.totalInterestPaid)).toLocaleString()}`,
                    link: '/loans',
                    priority: 2,
                    gameTime
                  });
                } catch (nErr) { /* non-critical */ }
              }

              await loan.save();
            } catch (lErr) {
              console.error(`Error processing loan ${loan.id}:`, lErr.message);
            }
          }

          // Save membership balance after all loans processed
          await membership.save();

          // Record total loan payments in weekly financial
          if (totalPaymentThisWeek > 0) {
            try {
              const [weekRecord] = await WeeklyFinancial.findOrCreate({
                where: { worldMembershipId: membership.id, weekStart },
                defaults: {}
              });
              await weekRecord.increment({ loanPayments: totalPaymentThisWeek });
            } catch (wfErr) { /* non-critical */ }
          }
        } catch (mErr) {
          // Skip individual membership errors
        }
      }
    } catch (error) {
      console.error('Error processing loan payments:', error.message);
    }
  }

  /**
   * Process aircraft deliveries for on-order aircraft whose delivery date has passed.
   * - Cash financing: deduct remaining payment from balance (fallback to Condor loan if insufficient)
   * - Loan financing: auto-create fleet_expansion loan with pre-selected bank
   * - Assign fresh maintenance check dates and activate the aircraft
   */
  async processDeliveries(worldId, gameTime) {
    try {
      const Loan = require('../models/Loan');
      const { getBank, calculateOfferRate, calculateFixedPayment } = require('../data/bankConfig');

      const memberships = await WorldMembership.findAll({
        where: { worldId, isActive: true }
      });

      for (const membership of memberships) {
        try {
          // Find all on-order aircraft ready for delivery
          const readyAircraft = await UserAircraft.findAll({
            where: {
              worldMembershipId: membership.id,
              status: 'on_order',
              expectedDeliveryDate: { [Op.lte]: gameTime }
            },
            include: [{ model: Aircraft, as: 'aircraft' }]
          });

          if (readyAircraft.length === 0) continue;

          for (const ua of readyAircraft) {
            const remaining = parseFloat(ua.remainingPayment) || 0;
            const balance = parseFloat(membership.balance) || 0;
            const acName = ua.aircraft ? `${ua.aircraft.manufacturer} ${ua.aircraft.model}` : ua.registration;

            // Assign fresh check dates for new aircraft — all checks valid from factory
            const now = new Date(gameTime);
            ua.lastCCheckDate = now;
            ua.lastDCheckDate = now;
            ua.cCheckIntervalDays = 600 + Math.floor(Math.random() * 120);
            ua.dCheckIntervalDays = 2190 + Math.floor(Math.random() * 1460);
            ua.lastDailyCheckDate = now;
            ua.lastWeeklyCheckDate = now;
            ua.lastACheckDate = now;
            ua.lastACheckHours = 0;
            ua.aCheckIntervalHours = 800 + Math.floor(Math.random() * 200);
            ua.acquiredAt = now;

            if (ua.acquisitionType === 'lease') {
              // Lease delivery: activate, set lease dates, deduct first weekly payment
              const weeklyPayment = parseFloat(ua.leaseWeeklyPayment) || 0;
              if (balance >= weeklyPayment) {
                membership.balance = balance - weeklyPayment;
                await membership.save();
              }
              // Set lease start to delivery time, calculate end date
              ua.leaseStartDate = now;
              const leaseEnd = new Date(now);
              leaseEnd.setMonth(leaseEnd.getMonth() + (ua.leaseDurationMonths || 36));
              ua.leaseEndDate = leaseEnd;
              ua.status = 'active';
              await ua.save();

              await Notification.create({
                worldMembershipId: membership.id,
                type: 'aircraft_delivered',
                icon: 'plane',
                title: `Lease Aircraft Delivered — ${ua.registration}`,
                message: `Your leased ${acName} has been delivered and is now active. Weekly payment: $${Math.round(weeklyPayment).toLocaleString('en-US')}.`,
                link: '/fleet',
                priority: 2,
                gameTime: now
              });
            } else if (ua.financingMethod === 'cash') {
              if (balance >= remaining) {
                // Pay remaining balance and activate
                membership.balance = balance - remaining;
                ua.status = 'active';
                await ua.save();
                await membership.save();

                // Record in weekly P&L (Aircraft Purchases) — bookkeeping only
                try {
                  const WeeklyFinancial = require('../models/WeeklyFinancial');
                  await WeeklyFinancial.addCost(membership.id, now, 'fleetCapitalCosts', remaining);
                } catch (wfErr) { console.error('Weekly financial record failed (delivery payment):', wfErr.message); }

                await Notification.create({
                  worldMembershipId: membership.id,
                  type: 'aircraft_delivered',
                  icon: 'plane',
                  title: `Aircraft Delivered — ${ua.registration}`,
                  message: `Your ${acName} has been delivered. Remaining payment of $${Math.round(remaining).toLocaleString('en-US')} deducted from balance.`,
                  link: '/fleet',
                  priority: 2,
                  gameTime: now
                });
              } else {
                // Insufficient funds: auto-create loan with Condor (penalty bank)
                const fallbackBankId = 'condor';
                const bank = getBank(fallbackBankId);
                const rate = calculateOfferRate(fallbackBankId, 400, 'fleet_expansion', now.getFullYear());
                const termWeeks = 156; // 3 years
                const weeklyPayment = calculateFixedPayment(remaining, rate, termWeeks);

                await Loan.create({
                  worldMembershipId: membership.id,
                  bankId: fallbackBankId,
                  loanType: 'fleet_expansion',
                  status: 'active',
                  principalAmount: remaining,
                  remainingPrincipal: remaining,
                  interestRate: rate,
                  termWeeks,
                  weeksRemaining: termWeeks,
                  repaymentStrategy: 'fixed',
                  weeklyPayment,
                  earlyRepaymentFee: bank.earlyRepaymentFee,
                  paymentHolidaysTotal: bank.paymentHolidays,
                  originationGameDate: now.toISOString().split('T')[0],
                  creditScoreAtOrigin: 400,
                  reference: `${ua.registration} ${acName}${ua.orderDate ? ` — ordered ${new Date(ua.orderDate).toISOString().split('T')[0]}` : ''}`
                });

                ua.status = 'active';
                ua.financingMethod = 'loan';
                ua.financingBankId = fallbackBankId;
                ua.financingTermWeeks = termWeeks;
                await ua.save();

                await Notification.create({
                  worldMembershipId: membership.id,
                  type: 'aircraft_delivered_forced_loan',
                  icon: 'alert-circle',
                  title: `Delivery Financed — ${ua.registration}`,
                  message: `Insufficient funds for delivery of ${acName}. A loan of $${Math.round(remaining).toLocaleString('en-US')} at ${rate}% was auto-created with ${bank.shortName}. Weekly payment: $${Math.round(weeklyPayment).toLocaleString('en-US')}.`,
                  link: '/loans',
                  priority: 1,
                  gameTime: now
                });
              }
            } else if (ua.financingMethod === 'loan') {
              // Create the pre-selected loan
              const bank = getBank(ua.financingBankId);
              const rate = bank ? calculateOfferRate(ua.financingBankId, 500, 'fleet_expansion', now.getFullYear()) : 7.0;
              const termWeeks = ua.financingTermWeeks || 156;
              const strategy = ['fixed', 'reducing', 'interest_only'].includes(ua.financingRepaymentStrategy)
                ? ua.financingRepaymentStrategy : 'fixed';
              // First-week payment per strategy (mirrors loans.js /apply)
              let weeklyPayment;
              if (strategy === 'reducing') {
                weeklyPayment = Math.round((remaining / termWeeks + remaining * (rate / 100 / 52)) * 100) / 100;
              } else if (strategy === 'interest_only') {
                weeklyPayment = Math.round(remaining * (rate / 100 / 52) * 100) / 100;
              } else {
                weeklyPayment = calculateFixedPayment(remaining, rate, termWeeks);
              }

              await Loan.create({
                worldMembershipId: membership.id,
                bankId: ua.financingBankId || 'condor',
                loanType: 'fleet_expansion',
                status: 'active',
                principalAmount: remaining,
                remainingPrincipal: remaining,
                interestRate: rate,
                termWeeks,
                weeksRemaining: termWeeks,
                repaymentStrategy: strategy,
                weeklyPayment,
                earlyRepaymentFee: bank?.earlyRepaymentFee || 0,
                paymentHolidaysTotal: bank?.paymentHolidays || 0,
                originationGameDate: now.toISOString().split('T')[0],
                creditScoreAtOrigin: 500,
                reference: `${ua.registration} ${acName}${ua.orderDate ? ` — ordered ${new Date(ua.orderDate).toISOString().split('T')[0]}` : ''}`
              });

              ua.status = 'active';
              await ua.save();

              await Notification.create({
                worldMembershipId: membership.id,
                type: 'aircraft_delivered',
                icon: 'plane',
                title: `Aircraft Delivered — ${ua.registration}`,
                message: `Your ${acName} has been delivered. Loan of $${Math.round(remaining).toLocaleString('en-US')} created with ${bank?.shortName || 'bank'}. Weekly payment: $${Math.round(weeklyPayment).toLocaleString('en-US')}.`,
                link: '/fleet',
                priority: 2,
                gameTime: now
              });
            }

            // Auto-schedule maintenance if preferences were set at order time
            if (ua.status === 'active') {
              const autoCheckTypes = [];
              if (ua.autoScheduleDaily) autoCheckTypes.push('daily');
              if (ua.autoScheduleWeekly) autoCheckTypes.push('weekly');
              if (ua.autoScheduleA) autoCheckTypes.push('A');
              if (ua.autoScheduleC) autoCheckTypes.push('C');
              if (ua.autoScheduleD) autoCheckTypes.push('D');
              if (autoCheckTypes.length > 0) {
                try {
                  const fleetRouter = require('../routes/fleet');
                  if (fleetRouter.createAutoScheduledMaintenance) {
                    await fleetRouter.createAutoScheduledMaintenance(ua.id, autoCheckTypes, worldId);
                  }
                } catch (schedErr) {
                  // Non-critical: maintenance can be scheduled manually
                }
              }
            }
          }
        } catch (mErr) {
          console.error(`Error processing deliveries for membership ${membership.id}:`, mErr.message);
        }
      }
    } catch (error) {
      console.error('Error processing deliveries:', error.message);
    }
  }

  /**
   * Process airline reputation for all memberships in a world
   * Reputation (0-100) based on: fleet age, maintenance, route profitability, fleet size
   */
  async processReputation(worldId, currentGameTime) {
    try {
      const memberships = await WorldMembership.findAll({
        where: { worldId, isActive: true }
      });

      const membershipIds = memberships.map(m => m.id);

      // Batch-load all fleets and routes once (instead of N+N queries per membership)
      const allFleet = await UserAircraft.findAll({
        where: { worldMembershipId: { [Op.in]: membershipIds }, status: { [Op.notIn]: ['sold'] } },
        include: [{ model: Aircraft, as: 'aircraft' }]
      });
      const fleetByMembership = {};
      for (const ac of allFleet) {
        (fleetByMembership[ac.worldMembershipId] || (fleetByMembership[ac.worldMembershipId] = [])).push(ac);
      }

      const allRoutes = await Route.findAll({
        where: { worldMembershipId: { [Op.in]: membershipIds }, isActive: true }
      });
      const routesByMembership = {};
      for (const r of allRoutes) {
        (routesByMembership[r.worldMembershipId] || (routesByMembership[r.worldMembershipId] = [])).push(r);
      }

      for (const membership of memberships) {
        try {
          const fleet = fleetByMembership[membership.id] || [];
          const routes = routesByMembership[membership.id] || [];

          // No fleet or routes = keep starting reputation, don't recalculate
          if (fleet.length === 0 && routes.length === 0) continue;

          // 1. Establishment score (0-20): airlines naturally gain reputation over time
          //    Uses joinedAt (when they joined the world) vs current game time
          //    Week 0: 0, Week 4: ~7, Week 8: ~11, Week 16: ~15, Week 24+: ~18-20
          let establishmentScore = 0;
          if (membership.joinedAt) {
            const ageMs = currentGameTime.getTime() - new Date(membership.joinedAt).getTime();
            const ageWeeks = ageMs / (7 * 24 * 60 * 60 * 1000);
            establishmentScore = Math.min(20, 20 * (1 - Math.exp(-ageWeeks / 10)));
          }

          // 2. Fleet age score (0-20): newer fleet = higher score
          let fleetAgeScore = 0;
          if (fleet.length > 0) {
            const avgAge = fleet.reduce((sum, ua) => sum + (parseFloat(ua.ageYears) || 0), 0) / fleet.length;
            // Age 0 → 20, Age 5 → 16, Age 15 → 8, Age 25+ → 4
            fleetAgeScore = Math.max(4, Math.min(20, 20 - avgAge * 0.64));
          }

          // 3. Maintenance score (0-20): well-maintained fleet = higher score
          let maintScore = 0;
          if (fleet.length > 0) {
            let totalCondition = 0;
            let overdueChecks = 0;

            for (const ua of fleet) {
              totalCondition += (ua.conditionPercentage || 100);

              // Check for overdue C-checks (every ~18 months)
              if (ua.lastCCheckDate) {
                const daysSinceC = (currentGameTime.getTime() - new Date(ua.lastCCheckDate).getTime()) / (24 * 60 * 60 * 1000);
                if (daysSinceC > 540) overdueChecks++;
              }
              // Check for overdue D-checks (every ~6 years)
              if (ua.lastDCheckDate) {
                const daysSinceD = (currentGameTime.getTime() - new Date(ua.lastDCheckDate).getTime()) / (24 * 60 * 60 * 1000);
                if (daysSinceD > 2190) overdueChecks++;
              }
            }

            const avgCondition = totalCondition / fleet.length;
            const overdueRatio = overdueChecks / fleet.length;

            // Condition: 100% → 20, 80% → 16, 60% → 12
            maintScore = Math.max(0, Math.min(20, avgCondition * 0.20));
            // Penalise overdue checks
            maintScore = Math.max(0, maintScore - overdueRatio * 8);
          }

          // 4. Route performance score (0-20): profitable routes with good LF
          let routeScore = 0;
          if (routes.length > 0) {
            let profitableCount = 0;
            let totalLF = 0;
            let routesWithData = 0;

            for (const r of routes) {
              const rev = parseFloat(r.totalRevenue) || 0;
              const cost = parseFloat(r.totalCosts) || 0;
              if (rev > 0) {
                routesWithData++;
                if (rev > cost) profitableCount++;
                totalLF += (parseFloat(r.averageLoadFactor) || 0);
              }
            }

            if (routesWithData > 0) {
              const profitRatio = profitableCount / routesWithData;
              const avgLF = totalLF / routesWithData;
              // Profit ratio 100% → 12, 50% → 6 | LF 0.8+ → 8, 0.5 → 5
              routeScore = profitRatio * 12 + Math.min(8, avgLF * 10);
            }
          }

          // 5. Fleet size score (0-10): larger fleets = more established
          let sizeScore = 0;
          if (fleet.length >= 1) sizeScore = 2;
          if (fleet.length >= 3) sizeScore = 4;
          if (fleet.length >= 6) sizeScore = 6;
          if (fleet.length >= 10) sizeScore = 8;
          if (fleet.length >= 20) sizeScore = 10;

          // 6. Network score (0-10): more routes = more connected
          let networkScore = 0;
          if (routes.length >= 1) networkScore = 2;
          if (routes.length >= 3) networkScore = 4;
          if (routes.length >= 6) networkScore = 6;
          if (routes.length >= 10) networkScore = 8;
          if (routes.length >= 20) networkScore = 10;

          // Total: up to 100 (20+20+20+20+10+10)
          const rawReputation = Math.round(establishmentScore + fleetAgeScore + maintScore + routeScore + sizeScore + networkScore);
          const newReputation = Math.max(1, Math.min(100, rawReputation));

          // Smooth the transition: move 10% toward target each tick to avoid jumps
          const currentRep = membership.reputation || 25;
          const smoothed = Math.round(currentRep + (newReputation - currentRep) * 0.10);
          const finalReputation = Math.max(1, Math.min(100, smoothed));

          // Build breakdown for tooltip display
          const ratingOf = (score, max) => {
            const pct = score / max;
            if (pct >= 0.8) return 'Excellent';
            if (pct >= 0.6) return 'Good';
            if (pct >= 0.4) return 'Average';
            if (pct >= 0.2) return 'Poor';
            return 'Very Poor';
          };

          const breakdown = [
            { label: 'Establishment', score: Math.round(establishmentScore), max: 20, rating: ratingOf(establishmentScore, 20) },
            { label: 'Fleet Age', score: Math.round(fleetAgeScore), max: 20, rating: ratingOf(fleetAgeScore, 20) },
            { label: 'Maintenance', score: Math.round(maintScore), max: 20, rating: ratingOf(maintScore, 20) },
            { label: 'Route Performance', score: Math.round(routeScore), max: 20, rating: ratingOf(routeScore, 20) },
            { label: 'Fleet Size', score: Math.round(sizeScore), max: 10, rating: ratingOf(sizeScore, 10) },
            { label: 'Network', score: Math.round(networkScore), max: 10, rating: ratingOf(networkScore, 10) }
          ];

          const updateData = { reputation: finalReputation, reputationBreakdown: breakdown };
          if (finalReputation !== currentRep) {
            await membership.update(updateData);
          } else {
            // Still update breakdown even if score unchanged
            await membership.update({ reputationBreakdown: breakdown });
          }
        } catch (memberErr) {
          // Skip this membership on error
        }
      }
    } catch (error) {
      console.error('Error processing reputation:', error.message);
    }
  }

  /**
   * Process maintenance check completions for a world
   * When a scheduled maintenance slot completes, record the check date on the aircraft
   */
  async processMaintenance(worldId, currentGameTime) {
    const worldState = this.worlds.get(worldId);
    if (!worldState) return;

    try {
      // Get all memberships for this world (cached)
      const membershipIds = await this._getMembershipIds(worldId);
      if (membershipIds.length === 0) return;

      // Get current game day of week (0 = Sunday, 6 = Saturday)
      const gameDayOfWeek = currentGameTime.getDay();
      const gameTimeStr = currentGameTime.toTimeString().split(' ')[0]; // HH:MM:SS
      const gameDate = currentGameTime.toISOString().split('T')[0]; // YYYY-MM-DD

      // Find all active maintenance that should have completed by now
      // Match by dayOfWeek (recurring patterns) OR by scheduledDate <= today (catches
      // past-dated records that were missed due to server restart / time catch-up)
      // Look back up to 90 game days to avoid scanning ancient records
      const lookbackDate = new Date(currentGameTime);
      lookbackDate.setDate(lookbackDate.getDate() - 90);
      const lookbackDateStr = lookbackDate.toISOString().split('T')[0];

      const maintenancePatterns = await RecurringMaintenance.findAll({
        where: {
          status: 'active',
          [Op.or]: [
            { dayOfWeek: gameDayOfWeek },
            { scheduledDate: { [Op.between]: [lookbackDateStr, gameDate] } }
          ]
        },
        include: [{
          model: UserAircraft,
          as: 'aircraft',
          where: { worldMembershipId: { [Op.in]: membershipIds } }
        }]
      });

      if (DEBUG_SIM && maintenancePatterns.length > 0) {
        simLog(`🔧 Processing ${maintenancePatterns.length} maintenance patterns for day ${gameDayOfWeek}, time ${gameTimeStr}`);
      }

      for (const pattern of maintenancePatterns) {
        // Calculate when maintenance ends (startTime + duration)
        // startTime can be a string "15:00:00" or a Date object depending on DB driver
        let startTimeStr = pattern.startTime;
        if (pattern.startTime instanceof Date) {
          startTimeStr = pattern.startTime.toTimeString().split(' ')[0];
        }
        const startTimeParts = String(startTimeStr).split(':');
        const startHour = parseInt(startTimeParts[0], 10);
        const startMinute = parseInt(startTimeParts[1], 10);

        // Calculate end time in minutes from midnight
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = startMinutes + pattern.duration;

        // For multi-day maintenance (C, D checks), calculate actual completion date/time
        const daysSpanned = Math.floor(endMinutes / 1440); // 1440 minutes per day
        const endMinuteOfDay = endMinutes % 1440;
        const endHour = Math.floor(endMinuteOfDay / 60);
        const endMinute = endMinuteOfDay % 60;
        const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;

        // Calculate the scheduled date (from scheduledDate or calculate from dayOfWeek)
        let maintenanceStartDate;
        if (pattern.scheduledDate) {
          maintenanceStartDate = new Date(pattern.scheduledDate + 'T00:00:00Z');
        } else {
          // For recurring patterns, use current game date
          maintenanceStartDate = new Date(gameDate + 'T00:00:00Z');
        }

        // Calculate actual completion date
        const completionDate = new Date(maintenanceStartDate);
        completionDate.setUTCDate(completionDate.getUTCDate() + daysSpanned);
        const completionDateStr = completionDate.toISOString().split('T')[0];

        // Check if current game date/time is past the maintenance end date/time
        const isPastCompletionDate = gameDate > completionDateStr ||
          (gameDate === completionDateStr && gameTimeStr >= endTimeStr);

        if (isPastCompletionDate) {
          const aircraft = pattern.aircraft;
          const checkType = pattern.checkType;

          // Check if we've already recorded this check today
          const checkFieldMap = {
            'daily': 'lastDailyCheckDate',
            'weekly': 'lastWeeklyCheckDate',
            'A': 'lastACheckDate',
            'C': 'lastCCheckDate',
            'D': 'lastDCheckDate'
          };
          const lastCheckField = checkFieldMap[checkType];
          if (!lastCheckField) continue; // Unknown check type
          const lastCheckDate = aircraft[lastCheckField];
          // Convert Date to ISO string for comparison
          let lastCheckDateStr = null;
          if (lastCheckDate) {
            if (lastCheckDate instanceof Date) {
              lastCheckDateStr = lastCheckDate.toISOString().split('T')[0];
            } else {
              // If it's already a string (shouldn't happen with TIMESTAMP), parse it
              lastCheckDateStr = new Date(lastCheckDate).toISOString().split('T')[0];
            }
          }

          // Check if this maintenance has already been recorded
          // Compare against the actual completion date, not just today
          const alreadyRecorded = lastCheckDateStr && lastCheckDateStr >= completionDateStr;

          if (!alreadyRecorded) {
            // Update the last check date with full datetime
            const updateData = {};
            updateData[lastCheckField] = currentGameTime; // Store full datetime

            // Cascading check validation:
            // D check → validates C, A, weekly, daily
            // C check → validates A, weekly, daily
            // A check → validates weekly, daily
            // weekly check → validates daily
            if (checkType === 'D') {
              updateData.lastCCheckDate = currentGameTime;
              updateData.lastACheckDate = currentGameTime;
              updateData.lastACheckHours = aircraft.totalFlightHours || 0;
              updateData.lastWeeklyCheckDate = currentGameTime;
              updateData.lastDailyCheckDate = currentGameTime;
            } else if (checkType === 'C') {
              updateData.lastACheckDate = currentGameTime;
              updateData.lastACheckHours = aircraft.totalFlightHours || 0;
              updateData.lastWeeklyCheckDate = currentGameTime;
              updateData.lastDailyCheckDate = currentGameTime;
            } else if (checkType === 'A') {
              updateData.lastWeeklyCheckDate = currentGameTime;
              updateData.lastDailyCheckDate = currentGameTime;
            } else if (checkType === 'weekly') {
              updateData.lastDailyCheckDate = currentGameTime;
            }
            if (['A', 'C', 'D', 'weekly'].includes(checkType)) {
              simLog(`🔧 ${checkType} Check also validates lower checks for ${aircraft.registration}`);
            }

            await aircraft.update(updateData);

            // Mark all one-time scheduled maintenance as completed
            // so they don't keep being re-queried on every tick
            if (pattern.scheduledDate) {
              await pattern.update({ status: 'completed' });
              simLog(`🔧 ${checkType} Check marked as completed for ${aircraft.registration}`);
            }

            simLog(`🔧 ${checkType} Check recorded for ${aircraft.registration} at ${endTimeStr} (date: ${gameDate})`);
          }
        }
      }
      // Catch-up: fix aircraft with expired daily/weekly checks after server gaps
      // If maintenance records were deleted by refresh before processMaintenance could handle them,
      // lastDailyCheckDate gets stuck in the past. Fix by updating any aircraft whose daily check
      // is expired but has active daily check patterns (meaning checks ARE scheduled).
      try {
        const expiredAircraft = await UserAircraft.findAll({
          where: {
            worldMembershipId: { [Op.in]: membershipIds },
            [Op.or]: [
              { lastDailyCheckDate: null },
              { lastDailyCheckDate: { [Op.lt]: new Date(currentGameTime.getTime() - 2 * 24 * 60 * 60 * 1000) } }
            ]
          }
        });

        // Batch-check which expired aircraft have active daily maintenance (1 query vs N)
        const expiredIds = expiredAircraft.map(a => a.id);
        const dailyMaintRecords = expiredIds.length > 0 ? await RecurringMaintenance.findAll({
          where: { aircraftId: { [Op.in]: expiredIds }, checkType: 'daily', status: 'active' },
          attributes: ['aircraftId']
        }) : [];
        const hasDailySet = new Set(dailyMaintRecords.map(m => m.aircraftId));

        for (const aircraft of expiredAircraft) {
          const hasDailyMaint = hasDailySet.has(aircraft.id);

          if (hasDailyMaint) {
            // Daily checks are scheduled but lastDailyCheckDate fell behind - catch up
            // Set to yesterday so the next scheduled check completion will bring it current
            const yesterday = new Date(currentGameTime);
            yesterday.setDate(yesterday.getDate() - 1);
            await aircraft.update({ lastDailyCheckDate: yesterday });
            simLog(`🔧 Daily check catch-up for ${aircraft.registration}: set lastDailyCheckDate to ${yesterday.toISOString().split('T')[0]}`);
          }
        }
      } catch (catchupErr) {
        // Non-critical - don't break main maintenance processing
        if (process.env.NODE_ENV === 'development') {
          console.error('Daily check catch-up error:', catchupErr.message);
        }
      }

      // Auto-schedule C and D checks the day before they expire
      await this.processAutomaticHeavyMaintenance(membershipIds, currentGameTime);

      // Prune old completed maintenance records — at most once per game-day per world
      if (this.lastMaintenancePruneDay[worldId] !== gameDate) {
        this.lastMaintenancePruneDay[worldId] = gameDate;
        await this.pruneOldMaintenanceRecords(membershipIds, currentGameTime);
      }

    } catch (error) {
      console.error('Error processing maintenance:', error);
    }
  }

  /**
   * Tiered retention for completed maintenance records (game-time based).
   * Routine daily/weekly completed rows are disposable once well past — the sim
   * reads last-check dates off the aircraft, not these rows — so keep only ~90
   * game-days. Heavy A/C/D checks are low-volume and meaningful history, kept
   * 10 game-years. Scoped per world (worlds may run at different eras) and
   * batched to respect the DB statement timeout.
   */
  async pruneOldMaintenanceRecords(membershipIds, currentGameTime) {
    if (!membershipIds || membershipIds.length === 0) return;
    if (!currentGameTime || isNaN(currentGameTime.getTime()) || currentGameTime.getFullYear() < 1950) return;

    const sequelize = require('../config/database');

    const shortCut = new Date(currentGameTime);
    shortCut.setDate(shortCut.getDate() - 90);
    const shortCutStr = shortCut.toISOString().split('T')[0];

    const longCut = new Date(currentGameTime);
    longCut.setFullYear(longCut.getFullYear() - 10);
    const longCutStr = longCut.toISOString().split('T')[0];

    let total = 0;
    for (let batch = 0; batch < 30; batch++) {
      const [, meta] = await sequelize.query(
        `DELETE FROM recurring_maintenance WHERE ctid IN (
           SELECT rm.ctid FROM recurring_maintenance rm
           JOIN user_aircraft ua ON ua.id = rm.aircraft_id
           WHERE rm.status = 'completed'
             AND ua.world_membership_id IN (:ids)
             AND (
               (rm.check_type IN ('daily','weekly') AND rm.scheduled_date < :shortCut)
               OR (rm.check_type IN ('A','C','D') AND rm.scheduled_date < :longCut)
             )
           LIMIT 10000
         )`,
        { replacements: { ids: membershipIds, shortCut: shortCutStr, longCut: longCutStr } }
      );
      const n = meta.rowCount || 0;
      total += n;
      if (n === 0) break;
    }
    if (total > 0) {
      simLog(`🧹 Pruned ${total} old completed maintenance records (daily/weekly < ${shortCutStr}, A/C/D < ${longCutStr})`);
    }
  }

  /**
   * Process automatic C and D check scheduling
   * Takes aircraft out of service the day before check expires
   */
  async processAutomaticHeavyMaintenance(membershipIds, currentGameTime) {
    try {
      const eraEconomicService = require('./eraEconomicService');
      const WeeklyFinancial = require('../models/WeeklyFinancial');
      const { CHECK_INTERVALS, getCheckDurationDays, getCheckLeadDays } = require('../config/maintenanceConfig');
      const worldYear = currentGameTime.getFullYear();

      const aircraft = await UserAircraft.findAll({
        where: {
          worldMembershipId: { [Op.in]: membershipIds },
          status: { [Op.in]: ['active', 'maintenance', 'cabin_refit'] }
        },
        include: [{ model: Aircraft, as: 'aircraft', attributes: ['type', 'cCheckCost', 'dCheckCost'] }]
      });

      // Per-airline concurrency: never ground more than ~15% of an airline's
      // fleet at once (min 1) so an expired-check backlog drains in staggered
      // waves instead of mass-grounding every carrier on the same tick.
      const fleetSize = new Map();
      const inMaint = new Map();
      for (const ac of aircraft) {
        fleetSize.set(ac.worldMembershipId, (fleetSize.get(ac.worldMembershipId) || 0) + 1);
        if (ac.status === 'maintenance') inMaint.set(ac.worldMembershipId, (inMaint.get(ac.worldMembershipId) || 0) + 1);
      }
      const groundCap = (mid) => Math.max(1, Math.ceil((fleetSize.get(mid) || 1) * 0.15));

      const chargeCheck = async (ac, cost) => {
        if (!(cost > 0)) return;
        const membership = await WorldMembership.findByPk(ac.worldMembershipId);
        if (membership) {
          membership.balance = (parseFloat(membership.balance) || 0) - cost;
          await membership.save();
        }
        try {
          const weekStart = WeeklyFinancial.getWeekStart(currentGameTime);
          const [weekRecord] = await WeeklyFinancial.findOrCreate({
            where: { worldMembershipId: ac.worldMembershipId, weekStart }, defaults: {}
          });
          await weekRecord.increment({ maintenanceCosts: Math.round(cost) });
        } catch (_) { /* non-critical */ }
      };

      for (const ac of aircraft) {
        const acType = ac.aircraft?.type;

        // 1) Return-to-service for completed heavy checks (frees a slot first).
        if (ac.status === 'maintenance') {
          let returned = null;
          if (ac.lastDCheckDate) {
            const dEnd = new Date(ac.lastDCheckDate);
            dEnd.setUTCDate(dEnd.getUTCDate() + getCheckDurationDays('D', acType));
            if (currentGameTime >= dEnd) returned = 'D';
          }
          if (!returned && ac.lastCCheckDate) {
            const cEnd = new Date(ac.lastCCheckDate);
            cEnd.setUTCDate(cEnd.getUTCDate() + getCheckDurationDays('C', acType));
            if (currentGameTime >= cEnd) returned = 'C';
          }
          if (returned) {
            await ac.update({ status: 'active' });
            inMaint.set(ac.worldMembershipId, Math.max(0, (inMaint.get(ac.worldMembershipId) || 1) - 1));
            simLog(`✓ ${ac.registration} returned to service after ${returned} Check`);
          }
          continue;
        }

        if (ac.status === 'cabin_refit') {
          if (ac.cabinRefitEndDate && currentGameTime >= new Date(ac.cabinRefitEndDate)) {
            await ac.update({ status: 'active', cabinRefitEndDate: null });
            simLog(`✓ ${ac.registration} returned to service after cabin refit`);
          }
          continue;
        }

        // 2) Grounding decision for active aircraft. Ground once the check is
        // within its (size-scaled) lead window so it COMPLETES before expiry;
        // a null last-check date means never done => overdue now. D outranks
        // C and also satisfies it (cascade).
        const candidates = [];
        const dInterval = ac.dCheckIntervalDays || CHECK_INTERVALS.D;
        const cInterval = ac.cCheckIntervalDays || CHECK_INTERVALS.C;
        {
          const dExp = ac.lastDCheckDate ? new Date(ac.lastDCheckDate) : new Date(currentGameTime);
          if (ac.lastDCheckDate) dExp.setUTCDate(dExp.getUTCDate() + dInterval); else dExp.setUTCDate(dExp.getUTCDate() - 1);
          candidates.push({ type: 'D', exp: dExp });
        }
        {
          const cExp = ac.lastCCheckDate ? new Date(ac.lastCCheckDate) : new Date(currentGameTime);
          if (ac.lastCCheckDate) cExp.setUTCDate(cExp.getUTCDate() + cInterval); else cExp.setUTCDate(cExp.getUTCDate() - 1);
          candidates.push({ type: 'C', exp: cExp });
        }

        let toGround = null;
        for (const cand of candidates) {
          const leadMs = getCheckLeadDays(cand.type, acType) * 86400000;
          if ((cand.exp - currentGameTime) <= leadMs) { // includes already-expired (negative)
            if (cand.type === 'D') { toGround = cand; break; }
            if (!toGround) toGround = cand;
          }
        }
        if (!toGround) continue;

        // Staggering cap — defer to a later tick if this airline is at capacity.
        if ((inMaint.get(ac.worldMembershipId) || 0) >= groundCap(ac.worldMembershipId)) continue;

        // Ground. Reset the check clock to NOW (maintenance start) so the
        // aircraft is legal from here and returns after the size-scaled
        // duration. A D check satisfies C/A/weekly/daily; C satisfies A/weekly/
        // daily (cascade — mirrors the scheduled-check engine).
        const nowHours = parseFloat(ac.totalFlightHours) || 0;
        const updates = {
          status: 'maintenance',
          lastCCheckDate: currentGameTime,
          lastACheckDate: currentGameTime,
          lastACheckHours: nowHours,
          lastWeeklyCheckDate: currentGameTime,
          lastDailyCheckDate: currentGameTime
        };
        if (toGround.type === 'D') updates.lastDCheckDate = currentGameTime;
        await ac.update(updates);
        inMaint.set(ac.worldMembershipId, (inMaint.get(ac.worldMembershipId) || 0) + 1);

        const costRaw = toGround.type === 'D' ? ac.aircraft?.dCheckCost : ac.aircraft?.cCheckCost;
        const cost = costRaw ? eraEconomicService.convertToEraPrice(parseFloat(costRaw), worldYear) : 0;
        await chargeCheck(ac, cost);
        simLog(`🔧 ${ac.registration} entering ${toGround.type} Check (${getCheckDurationDays(toGround.type, acType)}d) - cost: $${Math.round(cost).toLocaleString()}`);
      }
    } catch (error) {
      console.error('Error processing automatic heavy maintenance:', error);
    }
  }

  /**
   * Refresh auto-scheduled maintenance for all aircraft in a world
   * This runs once per game week to ensure daily/weekly checks stay scheduled ahead
   */
  async refreshMaintenanceSchedules(worldId) {
    try {
      // Import refreshAutoScheduledMaintenance from fleet routes
      const { refreshAutoScheduledMaintenance } = require('../routes/fleet');

      // Get all memberships for this world (cached)
      const membershipIds = await this._getMembershipIds(worldId);
      if (membershipIds.length === 0) return;

      // Get all aircraft with auto-scheduling enabled (exclude stored/sold/listed)
      const aircraftToRefresh = await UserAircraft.findAll({
        where: {
          worldMembershipId: { [Op.in]: membershipIds },
          status: { [Op.notIn]: ['on_order', 'storage', 'recalling', 'sold', 'listed_sale', 'listed_lease', 'leased_out'] },
          [Op.or]: [
            { autoScheduleDaily: true },
            { autoScheduleWeekly: true },
            { autoScheduleA: true },
            { autoScheduleC: true },
            { autoScheduleD: true }
          ]
        },
        attributes: ['id', 'registration']
      });

      if (aircraftToRefresh.length === 0) return;

      // Get game time once from memory to avoid repeated DB calls
      const gameTime = this.getCurrentTime(worldId);

      // Don't refresh with an unset/invalid clock — downstream scheduling would
      // otherwise generate epoch-dated (1970) maintenance rows.
      if (!gameTime || isNaN(gameTime.getTime()) || gameTime.getFullYear() < 1950) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[MAINT REFRESH] Skipping world ${worldId}: invalid game time (${gameTime ? gameTime.toISOString() : 'null'})`);
        }
        return;
      }

      simLog(`📅 Refreshing maintenance schedules for ${aircraftToRefresh.length} aircraft in world ${worldId}`);

      // Refresh maintenance for each aircraft (with delay to avoid DB overload)
      // Process in smaller batches with longer delays to prevent connection exhaustion
      for (let i = 0; i < aircraftToRefresh.length; i++) {
        const aircraft = aircraftToRefresh[i];
        let retries = 3;
        while (retries > 0) {
          try {
            // Pass game time to avoid DB calls
            await refreshAutoScheduledMaintenance(aircraft.id, worldId, gameTime);
            simLog(`📅 Refreshed maintenance for ${aircraft.registration} (${i + 1}/${aircraftToRefresh.length})`);
            break; // Success, exit retry loop
          } catch (err) {
            retries--;
            const isConnectionError = err.message && (
              err.message.includes('Connection terminated') ||
              err.message.includes('ECONNRESET') ||
              err.message.includes('timeout') ||
              err.message.includes('ETIMEDOUT')
            );
            if (isConnectionError && retries > 0) {
              console.log(`[MAINT REFRESH] Connection error for ${aircraft.registration}, retrying in 3s... (${retries} left)`);
              await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
              console.error(`Error refreshing maintenance for ${aircraft.registration}:`, err.message);
              break;
            }
          }
        }
        // 1.5 second delay between aircraft to let connection pool recover
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      simLog(`📅 Maintenance schedule refresh complete for world ${worldId}`);
    } catch (error) {
      console.error('Error refreshing maintenance schedules:', error);
    }
  }

  /**
   * Get current time for a specific world
   */
  getCurrentTime(worldId) {
    const worldState = this.worlds.get(worldId);
    if (worldState) {
      // Return a new Date object to prevent external modifications
      return new Date(worldState.inMemoryTime.getTime());
    }
    return null;
  }

  /**
   * Get world information for a specific world
   */
  async getWorldInfo(worldId) {
    const worldState = this.worlds.get(worldId);

    if (!worldState) {
      // World not loaded in memory, load from database
      const world = await World.findByPk(worldId);
      if (!world) return null;

      const elapsedMs = world.currentTime.getTime() - world.startDate.getTime();
      const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

      return {
        id: world.id,
        name: world.name,
        description: world.description,
        currentTime: world.currentTime,
        startDate: world.startDate,
        timeAcceleration: world.timeAcceleration,
        era: world.era,
        status: world.status,
        isPaused: world.isPaused,
        isOperating: world.isOperating ? world.isOperating() : false,
        elapsedDays: elapsedDays
      };
    }

    // Use in-memory time for running worlds
    const { world, inMemoryTime } = worldState;
    const elapsedMs = inMemoryTime.getTime() - world.startDate.getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

    return {
      id: world.id,
      name: world.name,
      description: world.description,
      currentTime: inMemoryTime,
      startDate: world.startDate,
      timeAcceleration: world.timeAcceleration,
      era: world.era,
      status: world.status,
      isPaused: world.isPaused,
      isOperating: !world.isPaused && world.status === 'active',
      elapsedDays: elapsedDays
    };
  }

  /**
   * Pause a world
   * @param {string} worldId
   * @param {Date|null} clientTime - client's calculated game time at moment of pause
   */
  async pauseWorld(worldId, clientTime) {
    const worldState = this.worlds.get(worldId);
    // Use client time if provided and valid, otherwise use server's in-memory time
    let freezeTime = null;
    if (clientTime && !isNaN(clientTime.getTime())) {
      freezeTime = clientTime;
    } else if (worldState) {
      freezeTime = worldState.inMemoryTime;
    }

    if (worldState) {
      worldState.world.isPaused = true;
      if (freezeTime) {
        worldState.inMemoryTime = freezeTime;
        worldState.world.currentTime = freezeTime;
      }
    }
    // Always persist to DB even if world not in memory
    const sequelize = require('../config/database');
    if (freezeTime) {
      await sequelize.query(
        'UPDATE worlds SET "is_paused" = true, "current_time" = :currentTime WHERE id = :worldId',
        { replacements: { worldId, currentTime: freezeTime } }
      );
    } else {
      await sequelize.query(
        'UPDATE worlds SET "is_paused" = true WHERE id = :worldId',
        { replacements: { worldId } }
      );
    }
    console.log(`⏸ World paused: ${worldId}${freezeTime ? ' at ' + freezeTime.toISOString() : ''}`);
  }

  /**
   * Record owner activity (client heartbeat) on the in-memory world so the
   * auto-pause sweep sees the session is still alive. The DB copy is updated by
   * the heartbeat route (for restart robustness).
   */
  recordActivity(worldId) {
    const ws = this.worlds.get(worldId);
    if (!ws || !ws.world) return false;
    ws.world.lastActiveAt = new Date();
    return ws.world.worldType === 'singleplayer';
  }

  /**
   * Sync the pause-on-session-end flag into the in-memory world.
   */
  setPauseOnSessionEnd(worldId, enabled) {
    const ws = this.worlds.get(worldId);
    if (ws && ws.world) {
      ws.world.pauseOnSessionEnd = !!enabled;
      if (enabled) ws.world.lastActiveAt = new Date();
    }
  }

  /**
   * Resume a world
   */
  async resumeWorld(worldId) {
    const now = new Date();
    const worldState = this.worlds.get(worldId);
    if (worldState) {
      worldState.world.isPaused = false;
      worldState.lastTickAt = now;
    }
    // Always persist to DB even if world not in memory
    const sequelize = require('../config/database');
    await sequelize.query(
      'UPDATE worlds SET "is_paused" = false, "last_tick_at" = :lastTickAt WHERE id = :worldId',
      { replacements: { worldId, lastTickAt: now } }
    );
    console.log(`▶ World resumed: ${worldId}`);

    // If world wasn't in memory, try to start it
    if (!worldState) {
      this.startWorld(worldId).catch(err => {
        console.error(`Failed to start world ${worldId} after resume:`, err.message);
      });
    }
  }

  /**
   * Set time acceleration for a world
   */
  async setTimeAcceleration(worldId, factor) {
    const worldState = this.worlds.get(worldId);
    if (worldState) {
      worldState.world.timeAcceleration = factor;
    }
    // Always persist to DB even if world not in memory
    const sequelize = require('../config/database');
    await sequelize.query(
      'UPDATE worlds SET "time_acceleration" = :factor WHERE id = :worldId',
      { replacements: { worldId, factor } }
    );
    console.log(`⏱ Time acceleration set to ${factor}x for world ${worldId}`);
  }

  /**
   * Process aircraft recall completions (recalling -> active)
   */
  async processRecalls(worldId, currentGameTime) {
    try {
      const membershipIds = await this._getMembershipIds(worldId);
      if (membershipIds.length === 0) return;
      const recallingAircraft = await UserAircraft.findAll({
        where: {
          worldMembershipId: { [Op.in]: membershipIds },
          status: 'recalling',
          recallAvailableAt: { [Op.lte]: currentGameTime }
        }
      });

      for (const ac of recallingAircraft) {
        // Determine ferry direction: currentAirport === storageAirportCode means ferrying TO storage
        const ferryingToStorage = ac.currentAirport && ac.storageAirportCode && ac.currentAirport === ac.storageAirportCode;

        if (ferryingToStorage) {
          // Arrived at boneyard - transition to storage
          await ac.update({ status: 'storage', storedAt: currentGameTime, recallAvailableAt: null });
          console.log(`Aircraft arrived at storage: ${ac.registration} -> storage at ${ac.storageAirportCode}`);

          try {
            const Notification = require('../models/Notification');
            await Notification.create({
              worldMembershipId: ac.worldMembershipId,
              type: 'aircraft_stored',
              icon: 'warehouse',
              title: `Aircraft Stored: ${ac.registration}`,
              message: `${ac.registration} has been ferried to ${ac.storageAirportCode} and is now in storage.`,
              link: '/fleet',
              priority: 3,
              gameTime: currentGameTime
            });
          } catch (e) {
            console.error('Error creating storage notification:', e.message);
          }
        } else {
          // Arrived at base - transition to active
          await ac.update({ status: 'active', recallAvailableAt: null, storageAirportCode: null });

          try {
            const { refreshAutoScheduledMaintenance } = require('../routes/fleet');
            await refreshAutoScheduledMaintenance(ac.id, worldId, currentGameTime);
          } catch (e) {
            console.error(`Error refreshing maintenance after recall for ${ac.registration}:`, e.message);
          }

          try {
            const Notification = require('../models/Notification');
            await Notification.create({
              worldMembershipId: ac.worldMembershipId,
              type: 'aircraft_recalled',
              icon: 'plane',
              title: `Aircraft Ready: ${ac.registration}`,
              message: `${ac.registration} has been ferried from storage and is now available for service.`,
              link: '/fleet',
              priority: 3,
              gameTime: currentGameTime
            });
          } catch (e) {
            console.error('Error creating recall notification:', e.message);
          }

          console.log(`Aircraft recall complete: ${ac.registration} -> active`);
        }
      }
    } catch (error) {
      console.error('Error processing recalls:', error);
    }
  }

  /**
   * Process aircraft listings: NPC buyers/lessees and lease-out income
   */
  async processListings(worldId, currentGameTime) {
    const Notification = require('../models/Notification');

    try {
      const memberships = await WorldMembership.findAll({
        where: { worldId, isActive: true },
        attributes: ['id', 'balance']
      });
      if (memberships.length === 0) return;

      const membershipIds = memberships.map(m => m.id);
      const membershipMap = new Map(memberships.map(m => [m.id, m]));

      // --- Process scrapping completions ---
      const scrappingAircraft = await UserAircraft.findAll({
        where: {
          worldMembershipId: { [Op.in]: membershipIds },
          status: 'scrapping',
          scrapAvailableAt: { [Op.lte]: currentGameTime }
        },
        include: [{ model: Aircraft, as: 'aircraft' }]
      });

      for (const ac of scrappingAircraft) {
        try {
          const scrapPrice = parseFloat(ac.scrapPrice) || 0;
          const membership = membershipMap.get(ac.worldMembershipId);
          if (membership) {
            membership.balance = (parseFloat(membership.balance) || 0) + scrapPrice;
            await membership.save();
          }

          const acName = ac.aircraft ? `${ac.aircraft.manufacturer} ${ac.aircraft.model}` : ac.registration;

          // Clean up related records
          await ScheduledFlight.destroy({ where: { aircraftId: ac.id } });
          await RecurringMaintenance.destroy({ where: { aircraftId: ac.id } });
          await Route.update(
            { assignedAircraftId: null, isActive: false },
            { where: { assignedAircraftId: ac.id } }
          );

          // Notify
          await Notification.create({
            worldMembershipId: ac.worldMembershipId,
            type: 'aircraft_sold',
            icon: 'plane',
            title: `Aircraft Scrapped — ${ac.registration}`,
            message: `${acName} (${ac.registration}) has been dismantled at ${ac.scrapCompanyName || ac.scrapAirportCode}. $${Math.round(scrapPrice).toLocaleString()} credited to your account.`,
            link: '/fleet',
            priority: 3,
            gameTime: currentGameTime
          });

          // Remove aircraft from game
          await ac.destroy();
          console.log(`[SCRAP] ${ac.registration} scrapped at ${ac.scrapAirportCode}, $${Math.round(scrapPrice)} credited`);
        } catch (scrapErr) {
          console.error(`[SCRAP] Error completing scrap for ${ac.registration}:`, scrapErr.message);
        }
      }

      // --- Process listed aircraft (NPC interest) ---
      const listedAircraft = await UserAircraft.findAll({
        where: {
          worldMembershipId: { [Op.in]: membershipIds },
          status: { [Op.in]: ['listed_sale', 'listed_lease'] },
          listedAt: { [Op.ne]: null }
        },
        include: [{ model: Aircraft, as: 'aircraft' }]
      });

      for (const ac of listedAircraft) {
        const listedAt = new Date(ac.listedAt);
        const daysSinceListed = (currentGameTime - listedAt) / (1000 * 60 * 60 * 24);

        // Minimum 7 game-days before any NPC interest
        if (daysSinceListed < 7) continue;

        // Probability increases over time: 5% base after 7 days, +1% per day, capped at 30%
        const chance = Math.min(0.30, 0.05 + (daysSinceListed - 7) * 0.01);
        if (Math.random() > chance) continue;

        const membership = membershipMap.get(ac.worldMembershipId);
        if (!membership) continue;

        if (ac.status === 'listed_sale') {
          await this.completeSale(ac, membership, currentGameTime, Notification);
        } else if (ac.status === 'listed_lease') {
          await this.completeLeaseOut(ac, membership, currentGameTime, Notification);
        }
      }

      // --- Process lease-out income (weekly) ---
      const WeeklyFinancial = require('../models/WeeklyFinancial');
      const currentWeek = WeeklyFinancial.getWeekStart(currentGameTime);
      const lastWeek = this.lastLeaseIncomeWeek[worldId] || '';

      if (currentWeek !== lastWeek) {
        this.lastLeaseIncomeWeek[worldId] = currentWeek;

        const leasedOutAircraft = await UserAircraft.findAll({
          where: {
            worldMembershipId: { [Op.in]: membershipIds },
            status: 'leased_out',
            leaseOutWeeklyRate: { [Op.ne]: null }
          }
        });

        for (const ac of leasedOutAircraft) {
          const membership = membershipMap.get(ac.worldMembershipId);
          if (!membership) continue;

          // Check if lease has expired
          if (ac.leaseOutEndDate && new Date(ac.leaseOutEndDate) <= currentGameTime) {
            await ac.update({
              status: 'active',
              leaseOutWeeklyRate: null,
              leaseOutStartDate: null,
              leaseOutEndDate: null,
              leaseOutTenantName: null,
              listingPrice: null,
              listedAt: null
            });

            await Notification.create({
              worldMembershipId: membership.id,
              type: 'lease_expired',
              icon: 'plane',
              title: `Lease Ended: ${ac.registration}`,
              message: `The lease on ${ac.registration} has expired. The aircraft has been returned to your fleet and is ready for service.`,
              link: '/fleet',
              priority: 3,
              gameTime: currentGameTime
            });

            console.log(`Lease expired: ${ac.registration} returned to fleet`);
            continue;
          }

          // Credit weekly lease income
          const rate = parseFloat(ac.leaseOutWeeklyRate);
          membership.balance = parseFloat(membership.balance) + rate;
          await membership.save();

          console.log(`Lease income: $${rate} from ${ac.registration} to membership ${membership.id}`);
        }

        // --- Process storage costs (weekly) ---
        const storedAircraft = await UserAircraft.findAll({
          where: {
            worldMembershipId: { [Op.in]: membershipIds },
            status: 'storage'
          }
        });

        for (const ac of storedAircraft) {
          const membership = membershipMap.get(ac.worldMembershipId);
          if (!membership) continue;

          const purchasePrice = parseFloat(ac.purchasePrice) || 0;
          let weeklyRate = 0.005 / 4.33; // default 0.5%/mo → weekly
          if (ac.storageAirportCode) {
            const sa = STORAGE_AIRPORTS.find(a => a.icao === ac.storageAirportCode);
            if (sa) weeklyRate = sa.weeklyRatePercent / 100;
          }
          const storageCost = Math.round(purchasePrice * weeklyRate);

          if (storageCost > 0) {
            membership.balance = parseFloat(membership.balance) - storageCost;
            await membership.save();
            console.log(`Storage cost: -$${storageCost} for ${ac.registration} at ${ac.storageAirportCode || 'unknown'} (${weeklyRate * 100}%/wk)`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing listings:', error);
    }
  }

  /**
   * Complete an NPC aircraft sale
   */
  async completeSale(userAircraft, membership, gameTime, Notification) {
    const salePrice = parseFloat(userAircraft.listingPrice);
    const reg = userAircraft.registration;
    const npcName = generateNpcAirlineName();

    // Credit sale price to balance
    membership.balance = parseFloat(membership.balance) + salePrice;
    await membership.save();

    // Clean up schedule remnants and delete the aircraft
    const { ScheduledFlight: SF, RecurringMaintenance: RM, Route: R } = require('../models');
    await SF.destroy({ where: { aircraftId: userAircraft.id } });
    await RM.destroy({ where: { aircraftId: userAircraft.id } });
    await R.update({ assignedAircraftId: null }, { where: { assignedAircraftId: userAircraft.id } });
    await userAircraft.destroy();

    // Create notification
    await Notification.create({
      worldMembershipId: membership.id,
      type: 'aircraft_sold',
      icon: 'dollar',
      title: `Aircraft Sold: ${reg}`,
      message: `${npcName} purchased your ${reg} for $${salePrice.toLocaleString()}. The funds have been credited to your account.`,
      link: '/fleet',
      priority: 2,
      gameTime: gameTime
    });

    console.log(`Aircraft sold: ${reg} to ${npcName} for $${salePrice}`);
  }

  /**
   * Complete an NPC aircraft lease-out
   */
  async completeLeaseOut(userAircraft, membership, gameTime, Notification) {
    const weeklyRate = parseFloat(userAircraft.listingPrice);
    const npcName = generateNpcAirlineName();
    const leaseDuration = 12 + Math.floor(Math.random() * 24); // 12-36 months

    const leaseStart = new Date(gameTime);
    const leaseEnd = new Date(gameTime);
    leaseEnd.setMonth(leaseEnd.getMonth() + leaseDuration);

    await userAircraft.update({
      status: 'leased_out',
      leaseOutWeeklyRate: weeklyRate,
      leaseOutStartDate: leaseStart,
      leaseOutEndDate: leaseEnd,
      leaseOutTenantName: npcName,
      listingPrice: null,
      listedAt: null
    });

    await Notification.create({
      worldMembershipId: membership.id,
      type: 'aircraft_leased_out',
      icon: 'plane',
      title: `Aircraft Leased: ${userAircraft.registration}`,
      message: `${npcName} is leasing your ${userAircraft.registration} for $${weeklyRate.toLocaleString()}/wk (${leaseDuration} months). Income will be credited weekly.`,
      link: '/fleet',
      priority: 2,
      gameTime: gameTime
    });

    console.log(`Aircraft leased out: ${userAircraft.registration} to ${npcName} at $${weeklyRate}/wk for ${leaseDuration} months`);
  }
}

/**
 * Generate a random NPC airline name
 */
function generateNpcAirlineName() {
  const prefixes = ['Pacific', 'Northern', 'Southern', 'Eastern', 'Western', 'Trans-Continental', 'Global', 'National', 'Royal', 'Air', 'Continental', 'Atlantic', 'Skyline', 'Horizon', 'Meridian', 'Polar', 'Coastal', 'Central', 'Imperial', 'United'];
  const suffixes = ['Airways', 'Airlines', 'Air', 'Aviation', 'Express', 'Jet', 'Connect', 'Wings', 'Flights', 'Aero'];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' + suffixes[Math.floor(Math.random() * suffixes.length)];
}

// Singleton instance
const worldTimeService = new WorldTimeService();

module.exports = worldTimeService;
