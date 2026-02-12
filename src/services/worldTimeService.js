const World = require('../models/World');
const { WorldMembership, User, ScheduledFlight, Route, UserAircraft, Aircraft, RecurringMaintenance } = require('../models');
const { Op } = require('sequelize');
const { calculateFlightDurationMs } = require('../utils/flightCalculations');
const path = require('path');
const { STORAGE_AIRPORTS } = require(path.join(__dirname, '../../public/js/storageAirports.js'));

/**
 * World Time Service
 * Manages the continuous progression of game time with acceleration for multiple worlds
 */
class WorldTimeService {
  constructor() {
    this.tickRate = 1000; // Update every 1 second (real time)
    this.worlds = new Map(); // Map of worldId -> { world, tickInterval, inMemoryTime, lastTickAt }
    // Throttle heavy DB queries to reduce load on remote databases
    this.lastCreditCheck = 0; // Timestamp of last credit check
    this.lastFlightCheck = 0; // Timestamp of last flight check
    this.lastMaintenanceCheck = 0; // Timestamp of last maintenance check
    this.lastMaintenanceRefresh = {}; // Map of worldId -> last game week refreshed
    this.creditCheckInterval = 30000; // Check credits every 30 seconds (real time)
    this.flightCheckInterval = 5000; // Check flights every 5 seconds (real time)
    this.maintenanceCheckInterval = 10000; // Check maintenance every 10 seconds (real time)
    this.isProcessingCredits = false; // Prevent overlapping credit queries
    this.isProcessingFlights = false; // Prevent overlapping flight queries
    this.isProcessingMaintenance = false; // Prevent overlapping maintenance queries
    this.isRefreshingMaintenance = false; // Prevent overlapping maintenance refresh
    this.lastListingCheck = 0; // Timestamp of last listing check
    this.listingCheckInterval = 60000; // Check listings every 60 seconds (real time)
    this.isProcessingListings = false; // Prevent overlapping listing queries
    this.lastLeaseIncomeMonth = {}; // Map of worldId -> last game month processed for lease income
    // AI decision processing
    this.lastAICheck = 0;
    this.aiCheckInterval = 30000; // Check AI decisions every 30 seconds (real time)
    this.isProcessingAI = false;
    // AI flight templates repeat weekly - no refresh needed
    // Notification refresh via Socket.IO
    this.lastNotificationCheck = 0;
    this.notificationCheckInterval = 30000; // Emit notification refresh every 30 real seconds
    this.lastNotificationDayEmitted = {}; // Map of worldId -> last game day where daily notification was emitted
    // Recall processing
    this.lastRecallCheck = 0;
    this.recallCheckInterval = 30000; // Check recalls every 30 seconds (real time)
    this.isProcessingRecalls = false;
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

    // Check for credit deductions (throttled to reduce DB load)
    if (!this.isProcessingCredits && now - this.lastCreditCheck >= this.creditCheckInterval) {
      this.lastCreditCheck = now;
      this.isProcessingCredits = true;
      this.processCredits(worldId, gameTime)
        .catch(err => console.error('Error processing credits:', err.message))
        .finally(() => { this.isProcessingCredits = false; });
    }

    // Process flight statuses (throttled to reduce DB load)
    if (!this.isProcessingFlights && now - this.lastFlightCheck >= this.flightCheckInterval) {
      this.lastFlightCheck = now;
      this.isProcessingFlights = true;
      this.processFlights(worldId, gameTime)
        .catch(err => console.error('Error processing flights:', err.message))
        .finally(() => { this.isProcessingFlights = false; });
    }

    // Process maintenance checks (throttled to reduce DB load)
    if (!this.isProcessingMaintenance && now - this.lastMaintenanceCheck >= this.maintenanceCheckInterval) {
      this.lastMaintenanceCheck = now;
      this.isProcessingMaintenance = true;
      this.processMaintenance(worldId, gameTime)
        .catch(err => console.error('Error processing maintenance:', err.message))
        .finally(() => { this.isProcessingMaintenance = false; });
    }

    // Refresh auto-scheduled maintenance once per game day
    // This ensures daily checks never expire (they have ~1-2 day validity)
    const gameDay = Math.floor(gameTime.getTime() / (24 * 60 * 60 * 1000));
    const lastRefreshDay = this.lastMaintenanceRefresh[worldId] || 0;
    if (!this.isRefreshingMaintenance && gameDay > lastRefreshDay) {
      this.lastMaintenanceRefresh[worldId] = gameDay;
      this.isRefreshingMaintenance = true;
      this.refreshMaintenanceSchedules(worldId)
        .catch(err => console.error('Error refreshing maintenance schedules:', err.message))
        .finally(() => { this.isRefreshingMaintenance = false; });
    }

    // Process aircraft listings (NPC buyers/lessees) and lease-out income
    if (!this.isProcessingListings && now - this.lastListingCheck >= this.listingCheckInterval) {
      this.lastListingCheck = now;
      this.isProcessingListings = true;
      this.processListings(worldId, gameTime)
        .catch(err => console.error('Error processing listings:', err.message))
        .finally(() => { this.isProcessingListings = false; });
    }

    // Process aircraft recall completions (recalling -> active)
    if (!this.isProcessingRecalls && now - this.lastRecallCheck >= this.recallCheckInterval) {
      this.lastRecallCheck = now;
      this.isProcessingRecalls = true;
      this.processRecalls(worldId, gameTime)
        .catch(err => console.error('Error processing recalls:', err.message))
        .finally(() => { this.isProcessingRecalls = false; });
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

    // AI flight schedules no longer need refresh - templates repeat weekly automatically

    // Emit notification refresh signal (throttled to every 30 real seconds)
    // Picks up computed notification changes from processing cycles above
    if (global.io && now - this.lastNotificationCheck >= this.notificationCheckInterval) {
      this.lastNotificationCheck = now;
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
      // Get all memberships for this world
      const memberships = await WorldMembership.findAll({
        where: { worldId: worldId, isActive: true },
        attributes: ['id']
      });

      const membershipIds = memberships.map(m => m.id);
      if (membershipIds.length === 0) return;

      const gameDate = currentGameTime.toISOString().split('T')[0]; // YYYY-MM-DD
      const gameDayOfWeek = currentGameTime.getDay(); // 0=Sun, 6=Sat
      const gameHours = currentGameTime.getHours();
      const gameMinutes = currentGameTime.getMinutes();
      const currentMinutesOfDay = gameHours * 60 + gameMinutes;

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
    } catch (error) {
      console.error('Error processing flights:', error);
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
    // Delegate to the existing processFlightRevenue logic
    await this.processFlightRevenue(template, worldId, currentGameTime);

    // Mark this route as having had revenue processed today
    await template.route.update({ lastRevenueGameDay: gameDate });

    // Record transit check on aircraft
    if (template.aircraft) {
      await template.aircraft.update({ lastTransitCheckDate: currentGameTime });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✓ Template flight ${template.route.routeNumber} revenue processed for ${gameDate}`);
    }
  }

  /**
   * Process revenue for a completed flight
   * Calculates passengers, revenue, costs, and updates route stats + airline balance
   */
  async processFlightRevenue(flight, worldId, currentGameTime) {
    try {
      const route = flight.route;
      if (!route) return;

      const eraEconomicService = require('./eraEconomicService');
      const aircraft = flight.aircraft;
      const paxCapacity = aircraft?.aircraft?.passengerCapacity || 150;
      const distance = parseFloat(route.distance) || 500;
      const worldYear = currentGameTime.getFullYear();

      // Get demand-influenced competitive load factor
      let loadFactor = 0.7; // Default
      try {
        const routeDemandService = require('./routeDemandService');

        // Count competing routes on this airport pair
        const competingRoutes = await Route.count({
          where: {
            departureAirportId: route.departureAirportId,
            arrivalAirportId: route.arrivalAirportId,
            isActive: true,
            worldMembershipId: { [Op.ne]: route.worldMembershipId }
          }
        });

        // Also count reverse direction
        const reverseCompeting = await Route.count({
          where: {
            departureAirportId: route.arrivalAirportId,
            arrivalAirportId: route.departureAirportId,
            isActive: true,
            worldMembershipId: { [Op.ne]: route.worldMembershipId }
          }
        });

        const totalCompetitors = competingRoutes + reverseCompeting;

        // Base load factor ceiling from era
        const expectedLF = eraEconomicService.getExpectedLoadFactor(worldYear) / 100;

        // Modulate by route demand: high demand routes fill planes, low demand don't
        // demand 100 -> factor 1.0, demand 50 -> factor 0.65, demand 0 -> factor 0.3
        let demandFactor = 1.0;
        try {
          const routeDemand = await routeDemandService.getRouteDemand(
            route.departureAirportId, route.arrivalAirportId, worldYear
          );
          demandFactor = 0.3 + 0.7 * (routeDemand.demand / 100);
        } catch (demandErr) {
          // Demand lookup failed, use full factor
        }

        loadFactor = expectedLF * demandFactor;

        // Reduce load factor based on competition
        if (totalCompetitors > 0) {
          // Each competitor reduces share (diminishing returns)
          const competitionPenalty = Math.min(0.4, totalCompetitors * 0.08);
          loadFactor *= (1 - competitionPenalty);
        }

        // Add some randomness (±10%)
        loadFactor *= (0.9 + Math.random() * 0.2);
        loadFactor = Math.max(0.15, Math.min(0.98, loadFactor));
      } catch (err) {
        // Competition check failed, use default
      }

      // Calculate passengers and revenue
      const passengers = Math.round(paxCapacity * loadFactor);
      const economyPrice = parseFloat(route.economyPrice) || 0;

      // Revenue: weighted average across cabin classes
      // Assume 80% economy, 12% economy+, 6% business, 2% first
      const economyPlusPrice = parseFloat(route.economyPlusPrice) || economyPrice * 1.3;
      const businessPrice = parseFloat(route.businessPrice) || economyPrice * 2.5;
      const firstPrice = parseFloat(route.firstPrice) || economyPrice * 4;

      const avgTicketPrice = (economyPrice * 0.80) + (economyPlusPrice * 0.12) +
                             (businessPrice * 0.06) + (firstPrice * 0.02);
      const ticketRevenue = Math.round(passengers * avgTicketPrice);

      // Cargo revenue (simplified)
      const cargoRevenue = Math.round(
        (parseFloat(route.cargoStandardRate) || 0) * (distance / 1000) * 5 // ~5 tons avg
      );

      const totalRevenue = ticketRevenue + cargoRevenue;

      // Calculate costs
      const fuelMultiplier = eraEconomicService.getFuelCostMultiplier(worldYear);
      const fuelCost = Math.round(distance * 2 * 3.5 * fuelMultiplier); // $3.50/nm base, round trip
      const crewCost = Math.round(distance * 2 * 0.8); // ~$0.80/nm crew cost
      const maintenanceCost = Math.round(distance * 2 * 0.5); // ~$0.50/nm maint cost
      const airportFees = Math.round(2000 + paxCapacity * 5); // Landing + handling fees
      const totalCosts = fuelCost + crewCost + maintenanceCost + airportFees;

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

      // Update aircraft flight hours
      if (aircraft) {
        const flightHours = (distance * 2 / (aircraft.aircraft?.cruiseSpeed || 450));
        aircraft.totalFlightHours = (parseFloat(aircraft.totalFlightHours) || 0) + flightHours;
        await aircraft.save();
      }
    } catch (error) {
      console.error('Error processing flight revenue:', error.message);
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
      // Get all memberships for this world
      const memberships = await WorldMembership.findAll({
        where: { worldId: worldId, isActive: true },
        attributes: ['id']
      });

      const membershipIds = memberships.map(m => m.id);
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

      if (process.env.NODE_ENV === 'development' && maintenancePatterns.length > 0) {
        console.log(`🔧 Processing ${maintenancePatterns.length} maintenance patterns for day ${gameDayOfWeek}, time ${gameTimeStr}`);
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
            if (['A', 'C', 'D', 'weekly'].includes(checkType) && process.env.NODE_ENV === 'development') {
              console.log(`🔧 ${checkType} Check also validates lower checks for ${aircraft.registration}`);
            }

            await aircraft.update(updateData);

            // Mark all one-time scheduled maintenance as completed
            // so they don't keep being re-queried on every tick
            if (pattern.scheduledDate) {
              await pattern.update({ status: 'completed' });
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔧 ${checkType} Check marked as completed for ${aircraft.registration}`);
              }
            }

            if (process.env.NODE_ENV === 'development') {
              console.log(`🔧 ${checkType} Check recorded for ${aircraft.registration} at ${endTimeStr} (date: ${gameDate})`);
            }
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

        for (const aircraft of expiredAircraft) {
          // Check if this aircraft has any active daily maintenance scheduled
          const hasDailyMaint = await RecurringMaintenance.findOne({
            where: {
              aircraftId: aircraft.id,
              checkType: 'daily',
              status: 'active'
            }
          });

          if (hasDailyMaint) {
            // Daily checks are scheduled but lastDailyCheckDate fell behind - catch up
            // Set to yesterday so the next scheduled check completion will bring it current
            const yesterday = new Date(currentGameTime);
            yesterday.setDate(yesterday.getDate() - 1);
            await aircraft.update({ lastDailyCheckDate: yesterday });
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔧 Daily check catch-up for ${aircraft.registration}: set lastDailyCheckDate to ${yesterday.toISOString().split('T')[0]}`);
            }
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

    } catch (error) {
      console.error('Error processing maintenance:', error);
    }
  }

  /**
   * Process automatic C and D check scheduling
   * Takes aircraft out of service the day before check expires
   */
  async processAutomaticHeavyMaintenance(membershipIds, currentGameTime) {
    try {
      // Get all active aircraft for these memberships
      const aircraft = await UserAircraft.findAll({
        where: {
          worldMembershipId: { [Op.in]: membershipIds },
          status: 'active' // Only check active aircraft
        }
      });

      const gameDate = currentGameTime.toISOString().split('T')[0];

      for (const ac of aircraft) {
        // Check C check expiry
        if (ac.lastCCheckDate && ac.cCheckIntervalDays) {
          const cCheckExpiry = new Date(ac.lastCCheckDate);
          cCheckExpiry.setUTCDate(cCheckExpiry.getUTCDate() + ac.cCheckIntervalDays);

          // Calculate days until expiry
          const daysUntilCExpiry = Math.floor((cCheckExpiry - currentGameTime) / (1000 * 60 * 60 * 24));

          // If check expires tomorrow or sooner, take aircraft out of service
          if (daysUntilCExpiry <= 1 && daysUntilCExpiry >= 0) {
            await ac.update({ status: 'maintenance' });
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔧 ${ac.registration} entering C Check maintenance (14 days) - expires in ${daysUntilCExpiry} day(s)`);
            }
          }
        }

        // Check D check expiry
        if (ac.lastDCheckDate && ac.dCheckIntervalDays) {
          const dCheckExpiry = new Date(ac.lastDCheckDate);
          dCheckExpiry.setUTCDate(dCheckExpiry.getUTCDate() + ac.dCheckIntervalDays);

          // Calculate days until expiry
          const daysUntilDExpiry = Math.floor((dCheckExpiry - currentGameTime) / (1000 * 60 * 60 * 24));

          // If check expires tomorrow or sooner, take aircraft out of service
          if (daysUntilDExpiry <= 1 && daysUntilDExpiry >= 0) {
            await ac.update({ status: 'maintenance' });
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔧 ${ac.registration} entering D Check maintenance (60 days) - expires in ${daysUntilDExpiry} day(s)`);
            }
          }
        }

        // Check if aircraft in maintenance should be returned to service
        // C check: 14 days, D check: 60 days
        if (ac.status === 'maintenance') {
          let shouldReturn = false;
          let checkCompleted = null;

          // Check if C check maintenance is complete
          if (ac.lastCCheckDate) {
            const cCheckStart = new Date(ac.lastCCheckDate);
            const cCheckEnd = new Date(cCheckStart);
            cCheckEnd.setUTCDate(cCheckEnd.getUTCDate() + 14); // 14 days duration

            if (currentGameTime >= cCheckEnd) {
              // C check duration completed - update the check date to now
              await ac.update({ lastCCheckDate: currentGameTime });
              shouldReturn = true;
              checkCompleted = 'C';
            }
          }

          // Check if D check maintenance is complete
          if (ac.lastDCheckDate) {
            const dCheckStart = new Date(ac.lastDCheckDate);
            const dCheckEnd = new Date(dCheckStart);
            dCheckEnd.setUTCDate(dCheckEnd.getUTCDate() + 60); // 60 days duration

            if (currentGameTime >= dCheckEnd) {
              // D check duration completed - update the check date to now
              await ac.update({ lastDCheckDate: currentGameTime });
              shouldReturn = true;
              checkCompleted = 'D';
            }
          }

          // Return aircraft to service if maintenance completed
          if (shouldReturn) {
            await ac.update({ status: 'active' });
            if (process.env.NODE_ENV === 'development') {
              console.log(`✓ ${ac.registration} returned to service after ${checkCompleted} Check maintenance`);
            }
          }
        }
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

      // Get all memberships for this world
      const memberships = await WorldMembership.findAll({
        where: { worldId, isActive: true },
        attributes: ['id']
      });

      const membershipIds = memberships.map(m => m.id);
      if (membershipIds.length === 0) return;

      // Get all aircraft with auto-scheduling enabled (exclude stored/sold/listed)
      const aircraftToRefresh = await UserAircraft.findAll({
        where: {
          worldMembershipId: { [Op.in]: membershipIds },
          status: { [Op.notIn]: ['storage', 'recalling', 'sold', 'listed_sale', 'listed_lease', 'leased_out'] },
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

      if (process.env.NODE_ENV === 'development') {
        console.log(`📅 Refreshing maintenance schedules for ${aircraftToRefresh.length} aircraft in world ${worldId} (gameTime: ${gameTime?.toISOString()})`);
      }

      // Refresh maintenance for each aircraft (with delay to avoid DB overload)
      // Process in smaller batches with longer delays to prevent connection exhaustion
      for (let i = 0; i < aircraftToRefresh.length; i++) {
        const aircraft = aircraftToRefresh[i];
        let retries = 3;
        while (retries > 0) {
          try {
            // Pass game time to avoid DB calls
            await refreshAutoScheduledMaintenance(aircraft.id, worldId, gameTime);
            if (process.env.NODE_ENV === 'development') {
              console.log(`📅 Refreshed maintenance for ${aircraft.registration} (${i + 1}/${aircraftToRefresh.length})`);
            }
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

      if (process.env.NODE_ENV === 'development') {
        console.log(`📅 Maintenance schedule refresh complete for world ${worldId}`);
      }
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
      const memberships = await WorldMembership.findAll({
        where: { worldId, isActive: true },
        attributes: ['id']
      });
      if (memberships.length === 0) return;

      const membershipIds = memberships.map(m => m.id);
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

      // --- Process lease-out income (monthly) ---
      const gameMonth = currentGameTime.getFullYear() * 12 + currentGameTime.getMonth();
      const lastMonth = this.lastLeaseIncomeMonth[worldId] || 0;

      if (gameMonth > lastMonth) {
        this.lastLeaseIncomeMonth[worldId] = gameMonth;

        const leasedOutAircraft = await UserAircraft.findAll({
          where: {
            worldMembershipId: { [Op.in]: membershipIds },
            status: 'leased_out',
            leaseOutMonthlyRate: { [Op.ne]: null }
          }
        });

        for (const ac of leasedOutAircraft) {
          const membership = membershipMap.get(ac.worldMembershipId);
          if (!membership) continue;

          // Check if lease has expired
          if (ac.leaseOutEndDate && new Date(ac.leaseOutEndDate) <= currentGameTime) {
            await ac.update({
              status: 'active',
              leaseOutMonthlyRate: null,
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

          // Credit monthly lease income
          const rate = parseFloat(ac.leaseOutMonthlyRate);
          membership.balance = parseFloat(membership.balance) + rate;
          await membership.save();

          console.log(`Lease income: $${rate} from ${ac.registration} to membership ${membership.id}`);
        }

        // --- Process storage costs (monthly) ---
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
          let monthlyRate = 0.005; // default 0.5%
          if (ac.storageAirportCode) {
            const sa = STORAGE_AIRPORTS.find(a => a.icao === ac.storageAirportCode);
            if (sa) monthlyRate = sa.monthlyRatePercent / 100;
          }
          const storageCost = Math.round(purchasePrice * monthlyRate);

          if (storageCost > 0) {
            membership.balance = parseFloat(membership.balance) - storageCost;
            await membership.save();
            console.log(`Storage cost: -$${storageCost} for ${ac.registration} at ${ac.storageAirportCode || 'unknown'} (${monthlyRate * 100}%/mo)`);
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
    const monthlyRate = parseFloat(userAircraft.listingPrice);
    const npcName = generateNpcAirlineName();
    const leaseDuration = 12 + Math.floor(Math.random() * 24); // 12-36 months

    const leaseStart = new Date(gameTime);
    const leaseEnd = new Date(gameTime);
    leaseEnd.setMonth(leaseEnd.getMonth() + leaseDuration);

    await userAircraft.update({
      status: 'leased_out',
      leaseOutMonthlyRate: monthlyRate,
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
      message: `${npcName} is leasing your ${userAircraft.registration} for $${monthlyRate.toLocaleString()}/mo (${leaseDuration} months). Income will be credited monthly.`,
      link: '/fleet',
      priority: 2,
      gameTime: gameTime
    });

    console.log(`Aircraft leased out: ${userAircraft.registration} to ${npcName} at $${monthlyRate}/mo for ${leaseDuration} months`);
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
