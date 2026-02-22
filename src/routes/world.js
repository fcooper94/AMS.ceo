const express = require('express');
const router = express.Router();
const worldTimeService = require('../services/worldTimeService');
const airportGrowthService = require('../services/airportGrowthService');
const historicalCountryService = require('../services/historicalCountryService');
const airportCacheService = require('../services/airportCacheService');
const airportSlotService = require('../services/airportSlotService');
const routeDemandService = require('../services/routeDemandService');
const routeIndicatorService = require('../services/routeIndicatorService');
const { Op } = require('sequelize');
const { World, WorldMembership, User, Airport, Aircraft, UserAircraft, Route, ScheduledFlight, RecurringMaintenance, PricingDefault, Notification, WeeklyFinancial, Loan } = require('../models');

/**
 * Get current world information (from session)
 */
router.get('/info', async (req, res) => {
  try {
    // Get active world from session
    const activeWorldId = req.session?.activeWorldId;

    if (!activeWorldId) {
      return res.status(404).json({
        error: 'No active world selected',
        message: 'Please select a world first'
      });
    }

    // Single query: get membership with world and airport in one go
    let world = null;
    let membership = null;
    let baseAirport = null;

    if (req.user) {
      membership = await WorldMembership.findOne({
        where: { worldId: activeWorldId },
        include: [
          { model: User, as: 'user', where: { vatsimId: req.user.vatsimId }, attributes: [] },
          { model: World, as: 'world' },
          { model: Airport, as: 'baseAirport' }
        ]
      });

      if (membership) {
        world = membership.world;
        baseAirport = membership.baseAirport;
      }
    }

    // Fallback: if no membership found, just load the world
    if (!world) {
      world = await World.findByPk(activeWorldId);
    }

    if (!world) {
      return res.status(404).json({
        error: 'World not found',
        message: 'The selected world does not exist'
      });
    }

    // Get the current time from worldTimeService (always up-to-date in memory)
    // instead of reading from database which is only saved every 10 seconds
    let currentTime = worldTimeService.getCurrentTime(activeWorldId);
    let timeSource = 'memory';

    if (!currentTime) {
      // Fall back to database time if world not loaded in memory
      timeSource = 'database';
      currentTime = world.currentTime;

      const timeDiffMs = Date.now() - world.lastTickAt?.getTime();
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠ World ${activeWorldId} (${world.name}) not in memory, using database time`);
        console.warn(`  Database time: ${currentTime.toISOString()}`);
        console.warn(`  Last tick: ${world.lastTickAt ? world.lastTickAt.toISOString() : 'never'} (${timeDiffMs ? Math.round(timeDiffMs / 1000) : '?'}s ago)`);
        console.warn(`  Time may be stale - attempting to start world...`);
      }

      // Try to start the world in memory for future requests
      worldTimeService.startWorld(activeWorldId).catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to start world:', err.message);
        }
      });
    } else if (process.env.NODE_ENV === 'development') {
      // Log successful in-memory time fetch
      const dbDiff = currentTime.getTime() - world.currentTime.getTime();
      if (Math.abs(dbDiff) > 60000) { // More than 1 minute difference
        console.log(`ℹ World ${world.name} in-memory time: ${currentTime.toISOString()}, DB time: ${world.currentTime.toISOString()} (diff: ${Math.round(dbDiff / 1000)}s)`);
      }
    }

    // Calculate elapsed days based on the world's dates
    const elapsedMs = currentTime.getTime() - world.startDate.getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

    // Calculate the decade from currentTime (e.g., 1995 -> "90's")
    const currentYear = currentTime.getFullYear();
    const decade = Math.floor(currentYear / 10) * 10;
    const decadeString = `${decade.toString().slice(-2)}'s`;

    // Return world info
    const worldInfo = {
      id: world.id,
      name: world.name,
      description: world.description,
      currentTime: currentTime,
      serverTimestamp: Date.now(), // Include server timestamp for accurate client-side calculation
      timeSource: timeSource, // 'memory' or 'database' - helps debug time issues
      startDate: world.startDate,
      timeAcceleration: world.timeAcceleration,
      era: decadeString,
      status: world.status,
      isPaused: world.isPaused,
      isOperating: world.isOperating ? world.isOperating() : false,
      elapsedDays: elapsedDays,
      // Include user's membership data
      airlineName: membership?.airlineName,
      airlineCode: membership?.airlineCode,
      iataCode: membership?.iataCode,
      balance: membership?.balance || 0,
      reputation: membership?.reputation || 0,
      reputationBreakdown: membership?.reputationBreakdown || null,
      worldType: world.worldType || 'multiplayer',
      difficulty: world.difficulty || null,
      endDate: world.endDate || null,
      freeWeeks: world.freeWeeks || 0,
      weeklyCost: world.weeklyCost !== undefined ? world.weeklyCost : 1,
      lastCreditDeduction: membership?.lastCreditDeduction || null,
      joinedAt: membership?.joinedAt || null,
      // Include base airport info for registration prefix and route planning
      baseAirport: baseAirport ? {
        id: baseAirport.id,
        icaoCode: baseAirport.icaoCode,
        iataCode: baseAirport.iataCode,
        name: baseAirport.name,
        city: baseAirport.city,
        country: baseAirport.country,
        latitude: parseFloat(baseAirport.latitude),
        longitude: parseFloat(baseAirport.longitude)
      } : null,
      // Service contractor selections
      cleaningContractor: membership?.cleaningContractor || 'standard',
      groundContractor: membership?.groundContractor || 'standard',
      engineeringContractor: membership?.engineeringContractor || 'standard'
    };

    res.json(worldInfo);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting world info:', error);
    }
    res.status(500).json({ error: 'Failed to get world information' });
  }
});

/**
 * Get current game time
 */
router.get('/time', async (req, res) => {
  try {
    const currentTime = await worldTimeService.getCurrentTime();

    if (!currentTime) {
      return res.status(404).json({ error: 'No active world found' });
    }

    res.json({
      gameTime: currentTime.toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting world time:', error);
    }
    res.status(500).json({ error: 'Failed to get world time' });
  }
});

/**
 * Get ATC route computation status (used by world map loading overlay)
 */
router.get('/airway-status', (req, res) => {
  const airwayService = require('../services/airwayService');
  res.json(airwayService.getBackfillStatus());
});

/**
 * Recompute all ATC routes (nulls waypoints then re-runs backfill)
 */
router.post('/recompute-routes', async (req, res) => {
  try {
    const airwayService = require('../services/airwayService');
    if (!airwayService.isReady()) {
      return res.status(503).json({ error: 'Airway service not ready' });
    }

    const status = airwayService.getBackfillStatus();
    if (status.running) {
      return res.status(409).json({ error: 'Route computation already in progress' });
    }

    const { Route } = require('../models');
    const [updated] = await Route.update(
      { waypoints: null },
      { where: { isActive: true } }
    );

    // Clear the in-memory route cache
    airwayService.routeCache.clear();

    // Trigger backfill in background
    airwayService.backfillMissingWaypoints();

    res.json({ success: true, routesCleared: updated });
  } catch (error) {
    console.error('Error recomputing routes:', error);
    res.status(500).json({ error: 'Failed to start route recomputation' });
  }
});

/**
 * Pause the world
 */
router.post('/pause', async (req, res) => {
  try {
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }
    const clientTime = req.body?.clientTime ? new Date(req.body.clientTime) : null;
    await worldTimeService.pauseWorld(activeWorldId, clientTime);
    res.json({ message: 'World paused', status: 'paused' });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error pausing world:', error);
    }
    res.status(500).json({ error: 'Failed to pause world' });
  }
});

/**
 * Resume the world
 */
router.post('/resume', async (req, res) => {
  try {
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }
    await worldTimeService.resumeWorld(activeWorldId);
    res.json({ message: 'World resumed', status: 'active' });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error resuming world:', error);
    }
    res.status(500).json({ error: 'Failed to resume world' });
  }
});

/**
 * Set time acceleration
 */
router.post('/acceleration', async (req, res) => {
  try {
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    const { factor } = req.body;

    if (!factor || factor <= 0 || factor > 240) {
      return res.status(400).json({ error: 'Invalid acceleration factor (max 240x)' });
    }

    await worldTimeService.setTimeAcceleration(activeWorldId, parseFloat(factor));

    res.json({
      message: 'Time acceleration updated',
      factor: parseFloat(factor)
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error setting acceleration:', error);
    }
    res.status(500).json({ error: 'Failed to set time acceleration' });
  }
});

/**
 * Get all worlds
 */
router.get('/list', async (req, res) => {
  try {
    const worlds = await World.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json(worlds);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error listing worlds:', error);
    }
    res.status(500).json({ error: 'Failed to list worlds' });
  }
});

/**
 * Get specific world information by ID
 */
router.get('/:worldId/info', async (req, res) => {
  try {
    const { worldId } = req.params;

    // Get the specific world
    const world = await World.findByPk(worldId);

    if (!world) {
      return res.status(404).json({
        error: 'World not found',
        message: 'The requested world does not exist'
      });
    }

    // Calculate elapsed days based on the world's dates
    const elapsedMs = world.currentTime.getTime() - world.startDate.getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

    // Calculate the decade from currentTime (e.g., 1995 -> "90's")
    const currentYear = world.currentTime.getFullYear();
    const decade = Math.floor(currentYear / 10) * 10;
    const decadeString = `${decade.toString().slice(-2)}'s`;

    // Return world info directly without using the service
    const worldInfo = {
      id: world.id,
      name: world.name,
      description: world.description,
      currentTime: world.currentTime,
      startDate: world.startDate,
      timeAcceleration: world.timeAcceleration,
      era: decadeString,
      status: world.status,
      isPaused: world.isPaused,
      isOperating: world.isOperating ? world.isOperating() : false,
      elapsedDays: elapsedDays
    };

    res.json(worldInfo);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting world info:', error);
    }
    res.status(500).json({ error: 'Failed to get world information' });
  }
});

/**
 * Get all airports for base selection (with caching)
 */
router.get('/airports', async (req, res) => {
  try {
    const startTime = Date.now();
    const { type, search, country, worldId, era } = req.query;

    // Determine effective world ID
    const effectiveWorldId = worldId || req.session?.activeWorldId;
    // Era override: used when creating a new SP world (no worldId yet)
    const eraYear = era ? parseInt(era, 10) : null;

    console.log(`[AIRPORT API] Request - worldId: ${effectiveWorldId}, era: ${eraYear}, type: ${type}, country: ${country}, search: ${search}`);

    // Try to get from cache first
    let airportsData = airportCacheService.get(effectiveWorldId, type, country, search, eraYear);
    let isFirstLoad = false;

    // If not in cache, fetch from database and cache it
    if (!airportsData) {
      console.log('[AIRPORT API] Cache MISS - fetching from database...');
      isFirstLoad = true;
      airportsData = await airportCacheService.fetchAndCacheAirports(
        effectiveWorldId,
        type,
        country,
        search,
        eraYear
      );
    } else {
      console.log('[AIRPORT API] Cache HIT - returning cached data');
    }

    const duration = Date.now() - startTime;
    console.log(`[AIRPORT API] Response time: ${duration}ms, airports: ${airportsData.length}`);

    res.json({
      airports: airportsData,
      isFirstLoad: isFirstLoad,
      count: airportsData.length
    });
  } catch (error) {
    console.error('Error fetching airports:', error);
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', error.stack);
    }
    res.status(500).json({ error: 'Failed to fetch airports', details: error.message });
  }
});

/**
 * Get airport by ICAO code
 */
router.get('/airports/:icaoCode', async (req, res) => {
  try {
    const { icaoCode } = req.params;

    const airport = await Airport.findOne({
      where: { icaoCode: icaoCode.toUpperCase() }
    });

    if (!airport) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    res.json(airport);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching airport:', error);
    }
    res.status(500).json({ error: 'Failed to fetch airport' });
  }
});

/**
 * Get top destinations with demand from an airport
 */
router.get('/airports/:id/demand', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    const worldId = req.session?.activeWorldId;

    if (!worldId) {
      return res.status(400).json({ error: 'No active world' });
    }

    const world = await World.findByPk(worldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    const currentYear = world.currentTime.getFullYear();

    const airport = await Airport.findByPk(id);
    if (!airport) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    const destinations = await routeDemandService.getTopDestinations(
      id,
      currentYear,
      parseInt(limit)
    );

    // Compute route indicators (yield, competition, ops feasibility)
    try {
      let playerMembershipId = null;
      if (req.user) {
        const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
        if (user) {
          const membership = await WorldMembership.findOne({ where: { userId: user.id, worldId } });
          playerMembershipId = membership?.id || null;
        }
      }

      const indicators = await routeIndicatorService.computeIndicators(
        airport, destinations, currentYear, worldId, playerMembershipId
      );

      for (const dest of destinations) {
        if (dest.airport) {
          dest.indicators = indicators[dest.airport.id] || null;
        }
      }
    } catch (indicatorErr) {
      console.error('Route indicators error:', indicatorErr);
    }

    res.json({
      airport,
      destinations,
      worldYear: currentYear
    });

  } catch (error) {
    console.error('Error fetching route demand:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get competing routes between two airports (both directions)
 * Returns airline name, schedule, aircraft type, and pricing
 */
router.get('/routes/competitors/:fromId/:toId', async (req, res) => {
  try {
    const { fromId, toId } = req.params;
    const worldId = req.session?.activeWorldId;

    if (!worldId) {
      return res.status(400).json({ error: 'No active world' });
    }

    // Find the player's membership to exclude their own routes
    let playerMembershipId = null;
    if (req.user) {
      const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
      if (user) {
        const membership = await WorldMembership.findOne({ where: { userId: user.id, worldId } });
        playerMembershipId = membership?.id || null;
      }
    }

    const whereClause = {
      isActive: true,
      [Op.or]: [
        { departureAirportId: fromId, arrivalAirportId: toId },
        { departureAirportId: toId, arrivalAirportId: fromId }
      ]
    };

    // Get all memberships in this world to filter routes
    const worldMemberships = await WorldMembership.findAll({
      where: { worldId, isActive: true },
      attributes: ['id']
    });
    const membershipIds = worldMemberships.map(m => m.id);
    whereClause.worldMembershipId = { [Op.in]: membershipIds };

    const routes = await Route.findAll({
      where: whereClause,
      include: [
        {
          model: WorldMembership,
          as: 'membership',
          attributes: ['id', 'airlineName', 'airlineCode']
        },
        {
          model: UserAircraft,
          as: 'assignedAircraft',
          attributes: ['id', 'registration'],
          include: [{
            model: Aircraft,
            as: 'aircraft',
            attributes: ['manufacturer', 'model', 'icaoCode', 'type']
          }]
        }
      ],
      attributes: [
        'id', 'routeNumber', 'scheduledDepartureTime', 'frequency',
        'daysOfWeek', 'distance', 'economyPrice', 'businessPrice',
        'firstPrice', 'averageLoadFactor', 'totalFlights',
        'departureAirportId', 'arrivalAirportId', 'worldMembershipId'
      ],
      order: [['scheduledDepartureTime', 'ASC']]
    });

    const competitors = routes.map(r => {
      const isPlayer = r.worldMembershipId === playerMembershipId;
      const isReverse = r.departureAirportId === toId;
      return {
        id: r.id,
        airlineName: r.membership?.airlineName || 'Unknown',
        airlineCode: r.membership?.airlineCode || '??',
        routeNumber: r.routeNumber,
        isPlayer,
        isReverse,
        departureTime: r.scheduledDepartureTime,
        frequency: r.frequency,
        daysOfWeek: r.daysOfWeek,
        aircraft: r.assignedAircraft?.aircraft
          ? `${r.assignedAircraft.aircraft.manufacturer} ${r.assignedAircraft.aircraft.model}`
          : null,
        aircraftIcao: r.assignedAircraft?.aircraft?.icaoCode || null,
        aircraftType: r.assignedAircraft?.aircraft?.type || null,
        economyPrice: r.economyPrice ? parseFloat(r.economyPrice) : null,
        businessPrice: r.businessPrice ? parseFloat(r.businessPrice) : null,
        firstPrice: r.firstPrice ? parseFloat(r.firstPrice) : null,
        averageLoadFactor: r.averageLoadFactor ? parseFloat(r.averageLoadFactor) : null,
        totalFlights: r.totalFlights || 0,
        distanceNm: r.distance ? parseFloat(r.distance) : null
      };
    });

    // Also fetch popular routes INTO the destination airport (from other origins)
    const popularRoutes = await Route.findAll({
      where: {
        isActive: true,
        arrivalAirportId: toId,
        departureAirportId: { [Op.ne]: fromId },
        worldMembershipId: { [Op.in]: membershipIds }
      },
      include: [
        {
          model: WorldMembership,
          as: 'membership',
          attributes: ['airlineName', 'airlineCode']
        },
        {
          model: Airport,
          as: 'departureAirport',
          attributes: ['icaoCode', 'city', 'country']
        }
      ],
      attributes: ['id', 'departureAirportId', 'frequency', 'daysOfWeek', 'worldMembershipId'],
      order: [['totalFlights', 'DESC']],
      limit: 15
    });

    // Group by origin airport, count airlines and routes
    const originMap = {};
    let totalInboundRoutes = 0;
    for (const r of popularRoutes) {
      const key = r.departureAirportId;
      totalInboundRoutes++;
      if (!originMap[key]) {
        originMap[key] = {
          icao: r.departureAirport?.icaoCode || '????',
          city: r.departureAirport?.city || '',
          country: r.departureAirport?.country || '',
          airlines: [],
          routeCount: 0
        };
      }
      originMap[key].routeCount++;
      const code = r.membership?.airlineCode || '??';
      if (!originMap[key].airlines.includes(code)) {
        originMap[key].airlines.push(code);
      }
    }

    const popularOrigins = Object.values(originMap)
      .sort((a, b) => b.routeCount - a.routeCount)
      .slice(0, 10);

    // Fetch all routes touching the destination airport for the time chart
    const flightCalc = require('../utils/flightCalculations');
    const allDestRoutes = await Route.findAll({
      where: {
        isActive: true,
        worldMembershipId: { [Op.in]: membershipIds },
        [Op.or]: [
          { departureAirportId: toId },
          { arrivalAirportId: toId }
        ]
      },
      include: [
        { model: Airport, as: 'departureAirport', attributes: ['latitude', 'longitude'] },
        { model: Airport, as: 'arrivalAirport', attributes: ['latitude', 'longitude'] },
        { model: UserAircraft, as: 'assignedAircraft', attributes: ['id'], include: [
          { model: Aircraft, as: 'aircraft', attributes: ['cruiseSpeed'] }
        ]}
      ],
      attributes: ['scheduledDepartureTime', 'distance', 'departureAirportId', 'arrivalAirportId']
    });

    // Build movements using the same flight duration calculation as the world map
    const airportMovements = [];
    for (const r of allDestRoutes) {
      const depTime = r.scheduledDepartureTime;
      if (!depTime) continue;
      const depHour = parseInt(depTime.substring(0, 2));
      const depMin = parseInt(depTime.substring(3, 5)) || 0;
      const distNm = parseFloat(r.distance) || 0;
      const cruiseSpeed = r.assignedAircraft?.aircraft?.cruiseSpeed || 450;
      const depLat = parseFloat(r.departureAirport?.latitude) || 0;
      const depLng = parseFloat(r.departureAirport?.longitude) || 0;
      const arrLat = parseFloat(r.arrivalAirport?.latitude) || 0;
      const arrLng = parseFloat(r.arrivalAirport?.longitude) || 0;

      const flightHours = flightCalc.calculateFlightDuration(distNm, depLng, arrLng, depLat, arrLat, cruiseSpeed);
      const flightMins = Math.round(flightHours * 60);
      const arrTotalMin = (depHour * 60 + depMin + flightMins) % 1440;
      const arrHour = Math.floor(arrTotalMin / 60);

      if (r.departureAirportId === toId) {
        airportMovements.push({ hour: depHour, type: 'dep' });
      } else {
        airportMovements.push({ hour: arrHour, type: 'arr' });
      }
    }

    // Look up both airport coordinates for frontend flight time calculations
    const [fromAirport, toAirport] = await Promise.all([
      Airport.findByPk(fromId, { attributes: ['latitude', 'longitude'] }),
      Airport.findByPk(toId, { attributes: ['latitude', 'longitude'] })
    ]);

    const routeCoords = {
      fromLat: parseFloat(fromAirport?.latitude) || 0,
      fromLng: parseFloat(fromAirport?.longitude) || 0,
      toLat: parseFloat(toAirport?.latitude) || 0,
      toLng: parseFloat(toAirport?.longitude) || 0
    };

    res.json({ competitors, popularOrigins, totalInboundRoutes, airportMovements, routeCoords });

  } catch (error) {
    console.error('Error fetching competitor routes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get detailed slot information for an airport
 */
router.get('/airports/:id/slots', async (req, res) => {
  try {
    const { id } = req.params;
    const worldId = req.session?.activeWorldId;

    if (!worldId) {
      return res.status(400).json({ error: 'No active world' });
    }

    const world = await World.findByPk(worldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    const currentYear = world.currentTime.getFullYear();
    const airport = await Airport.findByPk(id);
    if (!airport) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    const metrics = airportGrowthService.getAirportMetricsExtended(airport, currentYear);
    const slots = await airportSlotService.getSlotAvailability(id, worldId);

    res.json({
      airport: {
        id: airport.id,
        icaoCode: airport.icaoCode,
        name: airport.name
      },
      slots,
      metrics: {
        movementsIndex: metrics.movementsIndex,
        infrastructureLevel: metrics.infrastructureLevel,
        runways: metrics.runways
      }
    });

  } catch (error) {
    console.error('Error fetching slot data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Declare bankruptcy - liquidate all assets and reset airline
 */
router.post('/bankruptcy', async (req, res) => {
  const sequelize = require('../config/database');
  const transaction = await sequelize.transaction();

  try {
    const activeWorldId = req.session?.activeWorldId;

    if (!activeWorldId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No active world selected' });
    }

    if (!req.user) {
      await transaction.rollback();
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Get world info (for response)
    const world = await World.findByPk(activeWorldId);

    // Get membership
    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId },
      include: [
        { model: UserAircraft, as: 'fleet' },
        { model: Route, as: 'routes' }
      ]
    });

    if (!membership) {
      await transaction.rollback();
      return res.status(404).json({ error: 'No airline found in this world' });
    }

    // Calculate liquidation value (50% of aircraft purchase prices)
    let liquidationValue = 0;
    const aircraftSold = [];

    if (membership.fleet && membership.fleet.length > 0) {
      for (const aircraft of membership.fleet) {
        const saleValue = Math.round(parseFloat(aircraft.purchasePrice || 0) * 0.5);
        liquidationValue += saleValue;
        aircraftSold.push({
          registration: aircraft.registration,
          purchasePrice: parseFloat(aircraft.purchasePrice || 0),
          saleValue: saleValue
        });
      }
    }

    // Get aircraft IDs for deleting related records
    const aircraftIds = membership.fleet ? membership.fleet.map(a => a.id) : [];
    const routeIds = membership.routes ? membership.routes.map(r => r.id) : [];

    // Delete all related records in order (respect foreign keys)

    // 1. Delete scheduled flights for all routes
    if (routeIds.length > 0) {
      await ScheduledFlight.destroy({
        where: { routeId: routeIds },
        transaction
      });
    }

    // 2. Delete scheduled flights for all aircraft (maintenance blocks)
    if (aircraftIds.length > 0) {
      await ScheduledFlight.destroy({
        where: { aircraftId: aircraftIds },
        transaction
      });
    }

    // 3. Delete recurring maintenance
    if (aircraftIds.length > 0) {
      await RecurringMaintenance.destroy({
        where: { aircraftId: aircraftIds },
        transaction
      });
    }

    // 4. Delete routes
    await Route.destroy({
      where: { worldMembershipId: membership.id },
      transaction
    });

    // 5. Delete fleet
    await UserAircraft.destroy({
      where: { worldMembershipId: membership.id },
      transaction
    });

    // 6. Delete pricing defaults
    await PricingDefault.destroy({
      where: { worldMembershipId: membership.id },
      transaction
    });

    // 7. Delete notifications
    await Notification.destroy({
      where: { worldMembershipId: membership.id },
      transaction
    });

    // 7b. Delete weekly financials
    await WeeklyFinancial.destroy({
      where: { worldMembershipId: membership.id },
      transaction
    });

    // 7c. Delete loans
    await Loan.destroy({
      where: { worldMembershipId: membership.id },
      transaction
    });

    // 8. Delete the membership itself
    await membership.destroy({ transaction });

    // Clear the active world from session
    req.session.activeWorldId = null;

    await transaction.commit();

    console.log(`[BANKRUPTCY] User ${user.id} declared bankruptcy in world ${activeWorldId}. Liquidation value: $${liquidationValue}`);

    res.json({
      success: true,
      message: 'Bankruptcy declared successfully',
      worldId: activeWorldId,
      worldType: world ? world.worldType : null,
      summary: {
        airlineName: membership.airlineName,
        aircraftSold: aircraftSold.length,
        routesCancelled: routeIds.length,
        liquidationValue: liquidationValue,
        details: aircraftSold
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error declaring bankruptcy:', error);
    res.status(500).json({ error: 'Failed to declare bankruptcy', details: error.message });
  }
});

/**
 * Get competition overview for SP worlds
 * Returns top 20 airlines, airlines at player's base, and competitive routes
 */
router.get('/competition', async (req, res) => {
  try {
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(404).json({ error: 'No active world selected' });
    }

    const sequelize = require('../config/database');

    // Get world info
    const world = await World.findByPk(activeWorldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    // Get player membership via logged-in user
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const playerMembership = await WorldMembership.findOne({
      where: { worldId: activeWorldId, userId: user.id, isActive: true }
    });
    if (!playerMembership) {
      return res.status(404).json({ error: 'No active membership in this world' });
    }

    // Total AI count (cheap)
    const totalAICount = await WorldMembership.count({
      where: { worldId: activeWorldId, isAI: true, isActive: true }
    });

    // Use a single raw query to get airlines with stats efficiently
    // Gets fleet count & route stats via subqueries instead of N+1
    const [allRanked] = await sequelize.query(`
      SELECT wm.id, wm.airline_name, wm.airline_code, wm.iata_code, wm.is_ai,
             wm.balance, wm.reputation, wm.base_airport_id,
             a.icao_code AS base_icao, a.name AS base_name, a.city AS base_city, a.country AS base_country,
             COALESCE(fc.cnt, 0) AS fleet_count,
             COALESCE(rs.route_count, 0) AS route_count,
             COALESCE(rs.total_revenue, 0) AS total_revenue,
             COALESCE(rs.total_costs, 0) AS total_costs,
             COALESCE(rs.total_flights, 0) AS total_flights,
             COALESCE(rs.total_passengers, 0) AS total_passengers,
             ROW_NUMBER() OVER (ORDER BY COALESCE(rs.total_revenue, 0) DESC, wm.balance DESC) AS rank
      FROM world_memberships wm
      LEFT JOIN airports a ON a.id = wm.base_airport_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt FROM user_aircraft ua
        WHERE ua.world_membership_id = wm.id AND ua.status != 'sold'
      ) fc ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS route_count,
               SUM(COALESCE(r.total_revenue, 0)) AS total_revenue,
               SUM(COALESCE(r.total_costs, 0)) AS total_costs,
               SUM(COALESCE(r.total_flights, 0)) AS total_flights,
               SUM(COALESCE(r.total_passengers, 0)) AS total_passengers
        FROM routes r WHERE r.world_membership_id = wm.id AND r.is_active = true
      ) rs ON true
      WHERE wm.world_id = :worldId AND wm.is_active = true
      ORDER BY COALESCE(rs.total_revenue, 0) DESC, wm.balance DESC
    `, { replacements: { worldId: activeWorldId } });

    // Find player's rank
    const playerRank = allRanked.findIndex(r => r.id === playerMembership.id) + 1;

    // Build top 20 (always include the player even if outside top 20)
    const top20Ids = new Set(allRanked.slice(0, 20).map(r => r.id));
    top20Ids.add(playerMembership.id);
    const topAirlines = allRanked
      .filter(r => top20Ids.has(r.id))
      .map(formatRankedAirline);

    // Airlines at player's base airport
    const baseAirportAirlines = allRanked
      .filter(r => r.base_airport_id === playerMembership.baseAirportId && r.id !== playerMembership.id)
      .map(formatRankedAirline);

    // Find competitive routes
    let competitiveRoutes = [];
    const playerRoutes = await Route.findAll({
      where: { worldMembershipId: playerMembership.id, isActive: true },
      include: [
        { model: Airport, as: 'departureAirport', attributes: ['icaoCode', 'name'] },
        { model: Airport, as: 'arrivalAirport', attributes: ['icaoCode', 'name'] }
      ]
    });

    for (const pRoute of playerRoutes) {
      const competitors = await Route.findAll({
        where: {
          isActive: true,
          worldMembershipId: { [Op.ne]: playerMembership.id },
          [Op.or]: [
            { departureAirportId: pRoute.departureAirportId, arrivalAirportId: pRoute.arrivalAirportId },
            { departureAirportId: pRoute.arrivalAirportId, arrivalAirportId: pRoute.departureAirportId }
          ]
        },
        include: [{ model: WorldMembership, as: 'membership', attributes: ['airlineName', 'airlineCode'] }]
      });

      if (competitors.length > 0) {
        competitiveRoutes.push({
          routeNumber: pRoute.routeNumber,
          departure: pRoute.departureAirport?.icaoCode,
          arrival: pRoute.arrivalAirport?.icaoCode,
          playerPrice: parseFloat(pRoute.economyPrice) || 0,
          playerLoadFactor: parseFloat(pRoute.averageLoadFactor) || 0,
          competitors: competitors.map(c => ({
            airline: c.membership?.airlineName,
            code: c.membership?.airlineCode,
            price: parseFloat(c.economyPrice) || 0,
            loadFactor: parseFloat(c.averageLoadFactor) || 0
          }))
        });
      }
    }

    res.json({
      worldType: world.worldType,
      difficulty: world.difficulty,
      totalAICount,
      playerRank,
      totalAirlines: allRanked.length,
      topAirlines,
      baseAirportAirlines,
      competitiveRoutes,
      playerAirlineId: playerMembership.id,
      playerBaseAirport: {
        icaoCode: allRanked.find(r => r.id === playerMembership.id)?.base_icao,
        name: allRanked.find(r => r.id === playerMembership.id)?.base_name
      }
    });
  } catch (error) {
    console.error('Error fetching competition data:', error);
    res.status(500).json({ error: 'Failed to fetch competition data' });
  }
});

/**
 * Get detailed airline profile for modal popup
 */
router.get('/competition/:airlineId', async (req, res) => {
  try {
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(404).json({ error: 'No active world selected' });
    }

    const airline = await WorldMembership.findOne({
      where: { id: req.params.airlineId, worldId: activeWorldId, isActive: true },
      include: [{ model: Airport, as: 'baseAirport', attributes: ['icaoCode', 'iataCode', 'name', 'city', 'country'] }]
    });

    if (!airline) {
      return res.status(404).json({ error: 'Airline not found' });
    }

    // Fleet breakdown by aircraft type
    const fleet = await UserAircraft.findAll({
      where: { worldMembershipId: airline.id, status: 'active' },
      include: [{ model: Aircraft, as: 'aircraft', attributes: ['model', 'manufacturer', 'passengerCapacity', 'rangeNm'] }]
    });

    const fleetByType = {};
    for (const ac of fleet) {
      const model = ac.aircraft?.model || 'Unknown';
      if (!fleetByType[model]) {
        fleetByType[model] = {
          model,
          manufacturer: ac.aircraft?.manufacturer || '',
          capacity: ac.aircraft?.passengerCapacity || 0,
          range: ac.aircraft?.rangeNm || 0,
          count: 0
        };
      }
      fleetByType[model].count++;
    }

    // Routes with airport info
    const routes = await Route.findAll({
      where: { worldMembershipId: airline.id, isActive: true },
      include: [
        { model: Airport, as: 'departureAirport', attributes: ['icaoCode', 'iataCode', 'city'] },
        { model: Airport, as: 'arrivalAirport', attributes: ['icaoCode', 'iataCode', 'city'] }
      ],
      order: [['totalRevenue', 'DESC']]
    });

    const routeList = routes.map(r => ({
      routeNumber: r.routeNumber,
      departure: r.departureAirport?.icaoCode || '??',
      departureCity: r.departureAirport?.city || '',
      arrival: r.arrivalAirport?.icaoCode || '??',
      arrivalCity: r.arrivalAirport?.city || '',
      distance: Math.round(parseFloat(r.distance) || 0),
      economyPrice: parseFloat(r.economyPrice) || 0,
      loadFactor: parseFloat(r.averageLoadFactor) || 0,
      totalFlights: r.totalFlights || 0,
      totalRevenue: parseFloat(r.totalRevenue) || 0
    }));

    // Financial summary
    const totalRevenue = routes.reduce((sum, r) => sum + (parseFloat(r.totalRevenue) || 0), 0);
    const totalCosts = routes.reduce((sum, r) => sum + (parseFloat(r.totalCosts) || 0), 0);
    const totalFlights = routes.reduce((sum, r) => sum + (r.totalFlights || 0), 0);
    const totalPassengers = routes.reduce((sum, r) => sum + (r.totalPassengers || 0), 0);

    res.json({
      id: airline.id,
      airlineName: airline.airlineName,
      airlineCode: airline.airlineCode,
      iataCode: airline.iataCode,
      isAI: airline.isAI,
      reputation: airline.reputation || 0,
      balance: parseFloat(airline.balance) || 0,
      baseAirport: airline.baseAirport ? {
        icaoCode: airline.baseAirport.icaoCode,
        iataCode: airline.baseAirport.iataCode,
        name: airline.baseAirport.name,
        city: airline.baseAirport.city,
        country: airline.baseAirport.country
      } : null,
      fleet: Object.values(fleetByType),
      fleetCount: fleet.length,
      routes: routeList,
      routeCount: routes.length,
      financials: {
        totalRevenue: Math.round(totalRevenue),
        totalCosts: Math.round(totalCosts),
        profit: Math.round(totalRevenue - totalCosts),
        profitMargin: totalRevenue > 0 ? parseFloat(((totalRevenue - totalCosts) / totalRevenue * 100).toFixed(1)) : 0,
        totalFlights,
        totalPassengers
      }
    });
  } catch (error) {
    console.error('Error fetching airline detail:', error);
    res.status(500).json({ error: 'Failed to fetch airline detail' });
  }
});

function formatRankedAirline(row) {
  const totalRevenue = parseFloat(row.total_revenue) || 0;
  const totalCosts = parseFloat(row.total_costs) || 0;
  return {
    id: row.id,
    airlineName: row.airline_name,
    airlineCode: row.airline_code,
    iataCode: row.iata_code,
    isAI: row.is_ai,
    baseAirport: { icaoCode: row.base_icao, name: row.base_name, city: row.base_city, country: row.base_country },
    balance: parseFloat(row.balance) || 0,
    reputation: row.reputation,
    fleetCount: parseInt(row.fleet_count) || 0,
    routeCount: parseInt(row.route_count) || 0,
    totalRevenue,
    totalCosts,
    profit: totalRevenue - totalCosts,
    totalFlights: parseInt(row.total_flights) || 0,
    totalPassengers: parseInt(row.total_passengers) || 0,
    rank: parseInt(row.rank) || 0
  };
}

module.exports = router;
