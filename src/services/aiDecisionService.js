/**
 * AI Decision Service
 * Makes strategic decisions for AI airlines in single-player worlds:
 * - Route creation (finding opportunities, checking slots, assigning aircraft)
 * - Pricing adjustments based on difficulty/personality
 * - Fleet expansion (buying new aircraft when profitable)
 * - Network contraction (cancelling routes when losing money)
 * - Bankruptcy handling
 */

const { WorldMembership, Route, UserAircraft, Aircraft, Airport, ScheduledFlight, Notification } = require('../models');
const { Op } = require('sequelize');
const { AI_DIFFICULTY, pickPersonality } = require('../data/aiDifficultyConfig');
const { pickAIContractorTier } = require('../data/contractorConfig');
const eraEconomicService = require('./eraEconomicService');
const routeDemandService = require('./routeDemandService');
const airportSlotService = require('./airportSlotService');

/**
 * Get the human player's membership ID for a world (for sending notifications)
 */
async function getPlayerMembershipId(worldId) {
  const player = await WorldMembership.findOne({
    where: { worldId, isAI: false, isActive: true },
    attributes: ['id']
  });
  return player?.id || null;
}

/**
 * Create a notification for the player about an AI action
 */
async function notifyPlayer(worldId, title, message, gameTime, opts = {}) {
  try {
    const playerMembershipId = await getPlayerMembershipId(worldId);
    if (!playerMembershipId) return;

    await Notification.create({
      worldMembershipId: playerMembershipId,
      type: opts.type || 'operations',
      icon: opts.icon || 'plane',
      title,
      message,
      link: opts.link || '/competition',
      priority: opts.priority || 4,
      gameTime
    });
  } catch (err) {
    // Non-critical - don't let notification failures break AI decisions
  }
}

/**
 * Haversine distance in nautical miles
 */
function calculateDistanceNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Generate a flight number like "AB123" from IATA code
 */
function generateFlightNumber(iataCode, existingNumbers) {
  for (let i = 0; i < 200; i++) {
    const num = 100 + Math.floor(Math.random() * 900); // 100-999
    const fn = `${iataCode}${num}`;
    if (!existingNumbers.has(fn)) return fn;
  }
  return `${iataCode}${Math.floor(Math.random() * 9000) + 1000}`;
}

/**
 * Generate a departure time - AI airlines operate throughout the day
 */
function generateDepartureTime() {
  // Weight toward business-friendly hours (06:00-22:00)
  const hour = Math.random() < 0.8
    ? 6 + Math.floor(Math.random() * 16)  // 06-21
    : Math.floor(Math.random() * 24);      // any hour
  const minute = Math.floor(Math.random() * 12) * 5; // 5-minute increments
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

/**
 * Calculate arrival date/time for a route (simplified server-side version)
 */
function calculateArrivalDateTime(departureDate, departureTime, distanceNm, cruiseSpeed, turnaroundMinutes) {
  const depDateTime = new Date(`${departureDate}T${departureTime}`);
  const speed = cruiseSpeed || 450;
  const outboundMinutes = (distanceNm / speed) * 60;
  const returnMinutes = outboundMinutes; // Approximate (no wind calc for AI)
  const totalMinutes = outboundMinutes + (turnaroundMinutes || 45) + returnMinutes;

  const arrDateTime = new Date(depDateTime.getTime() + totalMinutes * 60 * 1000);
  const year = arrDateTime.getFullYear();
  const month = String(arrDateTime.getMonth() + 1).padStart(2, '0');
  const day = String(arrDateTime.getDate()).padStart(2, '0');
  const hours = String(arrDateTime.getHours()).padStart(2, '0');
  const mins = String(arrDateTime.getMinutes()).padStart(2, '0');

  return {
    arrivalDate: `${year}-${month}-${day}`,
    arrivalTime: `${hours}:${mins}:00`
  };
}

/**
 * Process AI decisions for all AI airlines in a world
 * Called from worldTimeService on a throttled interval
 */
async function processAIDecisions(worldId, gameTime) {
  try {
    // Find the world to check worldType
    const World = require('../models/World');
    const world = await World.findByPk(worldId);
    if (!world || world.worldType !== 'singleplayer') return;

    const config = AI_DIFFICULTY[world.difficulty] || AI_DIFFICULTY.medium;
    const decisionIntervalMs = config.decisionIntervalGameDays * 24 * 60 * 60 * 1000;

    // Only fetch AI airlines whose decision time has elapsed (avoids loading all 300+)
    const decisionCutoff = new Date(gameTime.getTime() - decisionIntervalMs);
    const aiAirlines = await WorldMembership.findAll({
      where: {
        worldId,
        isAI: true,
        isActive: true,
        [Op.or]: [
          { aiLastDecisionTime: null },
          { aiLastDecisionTime: { [Op.lte]: decisionCutoff } }
        ]
      },
      include: [{
        model: Airport,
        as: 'baseAirport'
      }],
      limit: 10, // Process max 10 airlines per tick to avoid blocking
      order: [['aiLastDecisionTime', 'ASC']] // Oldest first
    });

    if (aiAirlines.length === 0) return;

    const worldYear = gameTime.getFullYear();

    for (const airline of aiAirlines) {
      try {
        await runDecisionCycle(airline, world, config, gameTime, worldYear);
      } catch (err) {
        console.error(`[AI-DECISION] Error for ${airline.airlineName}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('[AI-DECISION] processAIDecisions error:', error.message);
  }
}

/**
 * Run a single decision cycle for an AI airline
 */
async function runDecisionCycle(airline, world, config, gameTime, worldYear) {
  // Refresh balance
  await airline.reload();
  const balance = parseFloat(airline.balance) || 0;

  // Get current fleet and routes
  const fleet = await UserAircraft.findAll({
    where: { worldMembershipId: airline.id, status: 'active' },
    include: [{ model: Aircraft, as: 'aircraft' }]
  });

  const routes = await Route.findAll({
    where: { worldMembershipId: airline.id, isActive: true },
    include: [
      { model: Airport, as: 'departureAirport' },
      { model: Airport, as: 'arrivalAirport' }
    ]
  });

  // Count routes per aircraft
  const routesPerAircraft = {};
  for (const route of routes) {
    if (route.assignedAircraftId) {
      routesPerAircraft[route.assignedAircraftId] = (routesPerAircraft[route.assignedAircraftId] || 0) + 1;
    }
  }

  // Find aircraft with no routes assigned
  const unassignedAircraft = fleet.filter(ac => !routesPerAircraft[ac.id]);

  // Assess financial health
  const totalRevenue = routes.reduce((sum, r) => sum + (parseFloat(r.totalRevenue) || 0), 0);
  const totalCosts = routes.reduce((sum, r) => sum + (parseFloat(r.totalCosts) || 0), 0);
  const isProfitable = totalRevenue > totalCosts || routes.length === 0; // No routes = just starting

  // Decision: Try to create routes for unassigned aircraft (allow even with negative balance — idle fleet earns nothing)
  if (unassignedAircraft.length > 0) {
    await tryCreateRoutes(airline, world, config, unassignedAircraft, routes, gameTime, worldYear);
  }

  // Decision: Expand if profitable and have budget
  const startingCapital = eraEconomicService.getStartingCapital(worldYear);
  const expansionThreshold = startingCapital * 0.3; // Need 30% of starting capital to expand

  if (isProfitable && balance > expansionThreshold && fleet.length < config.maxFleetSize) {
    // Consider buying a new aircraft
    if (Math.random() < 0.3) { // 30% chance per cycle to buy
      await tryBuyAircraft(airline, world, config, fleet, worldYear, gameTime);
    }
  }

  // Decision: Contract if losing money significantly
  if (!isProfitable && routes.length > 1 && balance < startingCapital * 0.1) {
    await tryContractNetwork(airline, routes, config, world, gameTime);
  }

  // Decision: Bankruptcy check - progressive stages
  if (balance < 0) {
    const deficit = Math.abs(balance);

    // Stage 1: Sell aircraft from unprofitable routes
    if (routes.length > 0 && deficit > startingCapital * 0.5) {
      await tryContractNetwork(airline, routes, config, world, gameTime);
    }

    // Stage 2: Full bankruptcy - deeply in debt or no operations at all
    if (balance < -startingCapital * 1.5 || (routes.length === 0 && fleet.length === 0)) {
      console.log(`[AI-DECISION] ${airline.airlineName} has gone bankrupt (balance: $${Math.round(balance)})`);
      airline.isActive = false;
      await airline.save();

      // Cancel any remaining routes and flights
      await Route.update({ isActive: false }, { where: { worldMembershipId: airline.id } });
      await ScheduledFlight.destroy({
        where: { routeId: { [Op.in]: routes.map(r => r.id) } }
      });

      // Notify player
      await notifyPlayer(world.id,
        `${airline.airlineName} Ceased Operations`,
        `${airline.airlineName} (${airline.airlineCode}) has gone bankrupt and ceased all operations.`,
        gameTime,
        { type: 'operations', icon: 'alert', priority: 3, link: '/competition' }
      );

      // Queue replacement spawn on Medium/Hard
      if (config.spawnReplacements) {
        scheduleReplacementSpawn(world, config, gameTime);
      }
      return;
    }
  }

  // Decision: Adjust pricing
  if (routes.length > 0 && Math.random() < 0.2) {
    await adjustPricing(airline, routes, config, worldYear, world, gameTime);
  }

  // Update last decision time
  airline.aiLastDecisionTime = gameTime;
  await airline.save();
}

/**
 * Try to create routes for aircraft that have none
 */
async function tryCreateRoutes(airline, world, config, unassignedAircraft, existingRoutes, gameTime, worldYear) {
  if (!airline.baseAirportId) return;

  // Get top destination opportunities
  let opportunities;
  try {
    opportunities = await routeDemandService.getTopDestinations(
      airline.baseAirportId, worldYear, 20
    );
  } catch (err) {
    // Fallback: get nearby airports directly
    opportunities = [];
  }

  if (!opportunities || opportunities.length === 0) {
    // Fallback: find airports by passenger volume
    const airports = await Airport.findAll({
      where: {
        id: { [Op.ne]: airline.baseAirportId }
      },
      order: [['traffic_demand', 'DESC']],
      limit: 20
    });
    opportunities = airports.map(ap => ({ airport: ap, demand: 50 }));
  }

  // Filter out destinations we already fly to
  const existingDestIds = new Set(existingRoutes.map(r => r.arrivalAirportId));
  const newOpportunities = opportunities.filter(o => {
    const apId = o.airport?.id || o.id;
    return !existingDestIds.has(apId);
  });

  if (newOpportunities.length === 0) return;

  // Apply route selection accuracy (lower difficulty = more random)
  const sorted = [...newOpportunities];
  if (Math.random() > config.routeSelectionAccuracy) {
    // Shuffle to pick a suboptimal route
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  }

  // Collect existing flight numbers
  const existingFlightNums = new Set(
    existingRoutes.flatMap(r => [r.routeNumber, r.returnRouteNumber].filter(Boolean))
  );

  const baseAirport = await Airport.findByPk(airline.baseAirportId);
  if (!baseAirport) return;

  // Try to assign routes to each unassigned aircraft (max 1 route per aircraft per cycle)
  for (const aircraft of unassignedAircraft) {
    if (sorted.length === 0) break;

    const destData = sorted.shift();
    let destAirport = destData.airport || destData;
    if (!destAirport.id) continue;

    // Ensure we have coordinates (getTopDestinations doesn't include lat/lon)
    if (!destAirport.latitude || !destAirport.longitude) {
      destAirport = await Airport.findByPk(destAirport.id);
      if (!destAirport) continue;
    }

    // Check aircraft range
    const distance = calculateDistanceNm(
      parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude),
      parseFloat(destAirport.latitude), parseFloat(destAirport.longitude)
    );

    // Skip if too far for this aircraft (rough range check)
    const cruiseSpeed = aircraft.aircraft?.cruiseSpeed || 450;
    const maxRange = cruiseSpeed * 12; // Very rough: 12 hours max flight
    if (distance > maxRange) continue;

    // Check slot availability
    try {
      const slotCheck = await airportSlotService.canCreateRoute(
        airline.baseAirportId, destAirport.id, world.id
      );
      if (!slotCheck.allowed) continue;
    } catch (err) {
      continue;
    }

    // Generate flight numbers
    const outboundNum = generateFlightNumber(airline.iataCode, existingFlightNums);
    existingFlightNums.add(outboundNum);
    const returnNum = generateFlightNumber(airline.iataCode, existingFlightNums);
    existingFlightNums.add(returnNum);

    // Calculate pricing
    const economyPrice = Math.round(eraEconomicService.calculateTicketPrice(distance, worldYear, 'economy') * config.pricingModifier);
    const businessPrice = Math.round(economyPrice * 2.5);
    const firstPrice = Math.round(economyPrice * 4);

    // Calculate turnaround (simplified)
    const paxCapacity = aircraft.aircraft?.passengerCapacity || 150;
    let turnaroundTime = 45;
    if (paxCapacity > 250) turnaroundTime = 75;
    else if (paxCapacity > 150) turnaroundTime = 60;
    else if (paxCapacity < 80) turnaroundTime = 30;

    const departureTime = generateDepartureTime();

    // Create the route
    try {
      const route = await Route.create({
        worldMembershipId: airline.id,
        routeNumber: outboundNum,
        returnRouteNumber: returnNum,
        departureAirportId: airline.baseAirportId,
        arrivalAirportId: destAirport.id,
        assignedAircraftId: aircraft.id,
        distance,
        scheduledDepartureTime: departureTime,
        turnaroundTime,
        frequency: 'daily',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        demand: destData.demand || 50,
        economyPrice,
        economyPlusPrice: Math.round(economyPrice * 1.3),
        businessPrice,
        firstPrice,
        cargoLightRate: Math.round(distance * 0.5),
        cargoStandardRate: Math.round(distance * 0.8),
        cargoHeavyRate: Math.round(distance * 1.2),
        transportType: 'both',
        isActive: true
      });

      // Compute airway waypoints
      try {
        const airwayService = require('./airwayService');
        if (airwayService.isReady()) {
          const wps = airwayService.computeRoute(
            parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude),
            parseFloat(destAirport.latitude), parseFloat(destAirport.longitude),
            baseAirport.icaoCode, destAirport.icaoCode
          );
          if (wps) await route.update({ waypoints: wps });
        }
      } catch (wpErr) { /* non-critical */ }

      // Create weekly flight templates
      await scheduleAIFlights(route, aircraft);

      console.log(`[AI-DECISION] ${airline.airlineName} created route ${outboundNum}: ${baseAirport.icaoCode}-${destAirport.icaoCode} (${distance}nm)`);

      // Notify player if this competes with their routes
      const playerCompeting = await Route.findOne({
        where: {
          worldMembershipId: { [Op.ne]: airline.id },
          isActive: true,
          [Op.or]: [
            { departureAirportId: airline.baseAirportId, arrivalAirportId: destAirport.id },
            { departureAirportId: destAirport.id, arrivalAirportId: airline.baseAirportId }
          ]
        },
        include: [{ model: WorldMembership, as: 'membership', where: { isAI: false } }]
      });
      if (playerCompeting) {
        await notifyPlayer(world.id,
          `New Competitor: ${baseAirport.icaoCode}-${destAirport.icaoCode}`,
          `${airline.airlineName} has launched ${outboundNum} on the ${baseAirport.icaoCode}-${destAirport.icaoCode} route, competing with your ${playerCompeting.routeNumber}.`,
          gameTime,
          { type: 'operations', icon: 'route', priority: 3, link: '/competition' }
        );
      }
    } catch (err) {
      console.error(`[AI-DECISION] Failed to create route for ${airline.airlineName}: ${err.message}`);
    }
  }
}

/**
 * Schedule weekly flight templates for an AI route
 */
async function scheduleAIFlights(route, aircraft) {
  const cruiseSpeed = aircraft.aircraft?.cruiseSpeed || 450;
  const daysOfWeek = route.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
  const depTime = route.scheduledDepartureTime;
  const distance = parseFloat(route.distance);
  const flightsToCreate = [];

  for (const dow of daysOfWeek) {
    // Check for existing template on this day
    const existing = await ScheduledFlight.findOne({
      where: { routeId: route.id, aircraftId: aircraft.id, dayOfWeek: dow }
    });
    if (existing) continue;

    // Use a reference date for arrival calculation
    const refDate = new Date('2024-01-07T00:00:00'); // Known Sunday
    refDate.setDate(refDate.getDate() + dow);
    const refDateStr = refDate.toISOString().split('T')[0];

    const { arrivalDate: refArrDate, arrivalTime } = calculateArrivalDateTime(
      refDateStr, depTime, distance, cruiseSpeed, route.turnaroundTime
    );

    const arrivalDayOffset = Math.round(
      (new Date(refArrDate + 'T00:00:00') - new Date(refDateStr + 'T00:00:00')) / 86400000
    );

    // Calculate total round-trip duration
    const [dh, dm] = depTime.split(':').map(Number);
    const [ah, am] = arrivalTime.split(':').map(Number);
    const totalDurationMinutes = (arrivalDayOffset * 1440) + (ah * 60 + am) - (dh * 60 + dm);

    flightsToCreate.push({
      routeId: route.id,
      aircraftId: aircraft.id,
      dayOfWeek: dow,
      departureTime: depTime,
      arrivalTime,
      arrivalDayOffset,
      totalDurationMinutes,
      isActive: true
    });
  }

  if (flightsToCreate.length > 0) {
    await ScheduledFlight.bulkCreate(flightsToCreate);
  }
}

/**
 * Get max appropriate passenger capacity for an airport type
 */
function getMaxCapacityForAirport(airportType) {
  switch (airportType) {
    case 'International Hub': return 9999;  // No limit
    case 'Major':             return 350;   // Up to widebody, no superjumbos
    case 'Regional':          return 200;   // Narrowbody only
    case 'Small Regional':    return 100;   // Regional jets only
    default:                  return 200;
  }
}

/**
 * Try to buy a new aircraft for the AI airline
 * Prefers aircraft types already in fleet (commonality) and appropriate for base airport size
 */
async function tryBuyAircraft(airline, world, config, currentFleet, worldYear, gameTime) {
  const balance = parseFloat(airline.balance) || 0;

  // Get era-appropriate aircraft
  const availableAircraft = await Aircraft.findAll({
    where: {
      availableFrom: { [Op.lte]: worldYear }
    },
    order: [['passengerCapacity', 'ASC']]
  });

  const eraAircraft = availableAircraft.filter(ac => {
    if (!ac.availableUntil) return true;
    return ac.availableUntil >= worldYear;
  });

  if (eraAircraft.length === 0) return;

  // Filter by budget (spend max 40% of balance)
  const maxSpend = balance * 0.4;
  const affordable = eraAircraft.filter(ac => {
    const price = parseFloat(ac.purchasePrice) || 50000000;
    return price <= maxSpend;
  });

  if (affordable.length === 0) return;

  // Filter by airport size — don't put 747s at tiny airports
  const baseAirport = airline.baseAirport || await Airport.findByPk(airline.baseAirportId);
  const maxPax = getMaxCapacityForAirport(baseAirport?.type);
  const sizeAppropriate = affordable.filter(ac => ac.passengerCapacity <= maxPax);
  const candidates = sizeAppropriate.length > 0 ? sizeAppropriate : affordable;

  // Fleet commonality: identify type families already in fleet
  const existingFamilies = new Set();
  for (const ac of currentFleet) {
    if (ac.aircraft) {
      existingFamilies.add(`${ac.aircraft.manufacturer} ${ac.aircraft.model}`);
    }
  }

  // Strongly prefer aircraft from existing type families (80% chance if available)
  const sameFamily = candidates.filter(ac => existingFamilies.has(`${ac.manufacturer} ${ac.model}`));
  const useCommonFleet = sameFamily.length > 0 && Math.random() < 0.8;
  const pool = useCommonFleet ? sameFamily : candidates;

  // Pick based on personality
  let chosen;
  if (airline.aiPersonality === 'aggressive') {
    chosen = pool[pool.length - 1];
  } else if (airline.aiPersonality === 'conservative') {
    chosen = pool[Math.floor(pool.length * 0.3)];
  } else {
    chosen = pool[Math.floor(pool.length * 0.5)];
  }

  const purchasePrice = parseFloat(chosen.purchasePrice) || 50000000;

  // Generate registration
  const existingRegs = new Set(currentFleet.map(ac => ac.registration));
  const prefixes = {
    'United Kingdom': 'G-', 'United States': 'N', 'France': 'F-', 'Germany': 'D-',
    'Japan': 'JA-', 'Australia': 'VH-', 'Canada': 'C-', 'Brazil': 'PT-'
  };
  const prefix = prefixes[airline.region] || 'XX-';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let reg;
  for (let i = 0; i < 100; i++) {
    reg = prefix;
    const suffLen = prefix.endsWith('-') ? 4 : (prefix.length === 1 ? 5 : 4);
    for (let j = 0; j < suffLen; j++) {
      reg += chars[Math.floor(Math.random() * 26)];
    }
    if (!existingRegs.has(reg)) break;
  }

  try {
    await UserAircraft.create({
      worldMembershipId: airline.id,
      aircraftId: chosen.id,
      registration: reg,
      acquisitionType: 'purchase',
      purchasePrice,
      totalFlightHours: 0,
      autoScheduleDaily: true,
      autoScheduleWeekly: true,
      lastDailyCheckDate: new Date(gameTime || new Date()),
      lastWeeklyCheckDate: new Date(gameTime || new Date()),
      lastACheckDate: new Date(gameTime || new Date()),
      lastACheckHours: 0,
      lastCCheckDate: new Date(gameTime || new Date()),
      lastDCheckDate: new Date(gameTime || new Date())
    });

    // Deduct cost
    airline.balance = parseFloat(airline.balance) - purchasePrice;
    await airline.save();

    console.log(`[AI-DECISION] ${airline.airlineName} purchased ${chosen.manufacturer} ${chosen.model} (${reg}) for $${(purchasePrice / 1000000).toFixed(1)}M`);

    // Notify player
    await notifyPlayer(world.id,
      `${airline.airlineName} Acquired Aircraft`,
      `${airline.airlineName} purchased a ${chosen.manufacturer} ${chosen.model}${chosen.variant ? ' ' + chosen.variant : ''} (${reg}).`,
      gameTime,
      { type: 'operations', icon: 'plane', priority: 5, link: '/competition' }
    );
  } catch (err) {
    console.error(`[AI-DECISION] ${airline.airlineName} failed to buy aircraft: ${err.message}`);
  }
}

/**
 * Contract the network by cancelling the least profitable route
 */
async function tryContractNetwork(airline, routes, config, world, gameTime) {
  // Find worst-performing route
  let worstRoute = null;
  let worstProfit = Infinity;

  for (const route of routes) {
    const revenue = parseFloat(route.totalRevenue) || 0;
    const costs = parseFloat(route.totalCosts) || 0;
    const profit = revenue - costs;
    if (profit < worstProfit) {
      worstProfit = profit;
      worstRoute = route;
    }
  }

  if (!worstRoute) return;

  // Cancel the route
  try {
    worstRoute.isActive = false;
    await worstRoute.save();

    // Delete flight templates for cancelled route
    await ScheduledFlight.destroy({
      where: { routeId: worstRoute.id }
    });

    console.log(`[AI-DECISION] ${airline.airlineName} cancelled route ${worstRoute.routeNumber} (unprofitable)`);

    // Notify player if they competed on this route
    if (world && gameTime) {
      const depCode = worstRoute.departureAirport?.icaoCode || '???';
      const arrCode = worstRoute.arrivalAirport?.icaoCode || '???';
      await notifyPlayer(world.id,
        `${airline.airlineName} Cancelled Route`,
        `${airline.airlineName} has cancelled their ${depCode}-${arrCode} route due to poor performance.`,
        gameTime,
        { type: 'operations', icon: 'route', priority: 5, link: '/competition' }
      );
    }
  } catch (err) {
    console.error(`[AI-DECISION] Failed to cancel route for ${airline.airlineName}: ${err.message}`);
  }
}

/**
 * Adjust pricing on existing routes based on personality and load factors
 */
async function adjustPricing(airline, routes, config, worldYear, world, gameTime) {
  // Pick a random route to adjust
  const route = routes[Math.floor(Math.random() * routes.length)];
  if (!route) return;

  const loadFactor = parseFloat(route.averageLoadFactor) || 0.7;
  const distance = parseFloat(route.distance) || 500;

  // Base market price
  const marketPrice = eraEconomicService.calculateTicketPrice(distance, worldYear, 'economy');
  let newPrice = Math.round(marketPrice * config.pricingModifier);

  // Adjust based on load factor
  if (loadFactor > 0.85) {
    // High demand - can increase prices
    newPrice = Math.round(newPrice * (1 + Math.random() * 0.1)); // up to +10%
  } else if (loadFactor < 0.5) {
    // Low demand - lower prices
    newPrice = Math.round(newPrice * (0.85 + Math.random() * 0.1)); // -5% to -15%
  }

  // Personality adjustments
  if (airline.aiPersonality === 'aggressive') {
    newPrice = Math.round(newPrice * 0.95); // 5% cheaper
  } else if (airline.aiPersonality === 'conservative') {
    newPrice = Math.round(newPrice * 1.05); // 5% more expensive
  }

  // Ensure minimum price
  newPrice = Math.max(newPrice, Math.round(distance * 0.05));

  const oldPrice = parseFloat(route.economyPrice) || 0;

  try {
    await route.update({
      economyPrice: newPrice,
      economyPlusPrice: Math.round(newPrice * 1.3),
      businessPrice: Math.round(newPrice * 2.5),
      firstPrice: Math.round(newPrice * 4)
    });

    // Notify player if AI undercut them on a competing route
    if (world && gameTime && newPrice < oldPrice) {
      const playerRoute = await Route.findOne({
        where: {
          isActive: true,
          worldMembershipId: { [Op.ne]: airline.id },
          [Op.or]: [
            { departureAirportId: route.departureAirportId, arrivalAirportId: route.arrivalAirportId },
            { departureAirportId: route.arrivalAirportId, arrivalAirportId: route.departureAirportId }
          ]
        },
        include: [{ model: WorldMembership, as: 'membership', where: { isAI: false } }]
      });

      if (playerRoute && newPrice < parseFloat(playerRoute.economyPrice)) {
        const depAp = await Airport.findByPk(route.departureAirportId, { attributes: ['icaoCode'] });
        const arrAp = await Airport.findByPk(route.arrivalAirportId, { attributes: ['icaoCode'] });
        await notifyPlayer(world.id,
          `Price Undercut: ${depAp?.icaoCode || '???'}-${arrAp?.icaoCode || '???'}`,
          `${airline.airlineName} lowered their economy fares on ${depAp?.icaoCode || '???'}-${arrAp?.icaoCode || '???'} to $${newPrice} (your price: $${Math.round(parseFloat(playerRoute.economyPrice))}).`,
          gameTime,
          { type: 'finance', icon: 'dollar', priority: 3, link: '/competition' }
        );
      }
    }
  } catch (err) {
    // Pricing update failed, not critical
  }
}

// refreshAIFlightSchedules removed - weekly templates repeat forever, no refresh needed

/**
 * Schedule a replacement AI airline to spawn after a delay
 * Only on Medium/Hard difficulty when an AI goes bankrupt
 */
function scheduleReplacementSpawn(world, config, gameTime) {
  // Delay: 30-90 game days worth of real time (based on time acceleration)
  const delayGameDays = 30 + Math.floor(Math.random() * 60);
  const delayMs = (delayGameDays * 24 * 60 * 60 * 1000) / (world.timeAcceleration || 60);
  const cappedDelay = Math.min(delayMs, 10 * 60 * 1000); // Cap at 10 minutes real time

  console.log(`[AI-SPAWN] Scheduling replacement AI in ${Math.round(cappedDelay / 1000)}s (${delayGameDays} game days)`);

  setTimeout(async () => {
    try {
      const World = require('../models/World');
      const freshWorld = await World.findByPk(world.id);
      if (!freshWorld || freshWorld.status !== 'active') return;

      // Check current AI count
      const currentAI = await WorldMembership.count({
        where: { worldId: world.id, isAI: true, isActive: true }
      });

      // Get the player to determine base airport for replacement spawning
      const player = await WorldMembership.findOne({
        where: { worldId: world.id, isAI: false, isActive: true },
        include: [{ model: Airport, as: 'baseAirport' }]
      });
      if (!player || !player.baseAirport) return;

      const { getAICount } = require('../data/aiDifficultyConfig');
      const targetCount = getAICount(freshWorld.difficulty);

      if (currentAI >= targetCount) return; // Already at max

      // Spawn one replacement
      const { spawnAIAirlines } = require('./aiSpawningService');

      // Create a mini-spawn (1 airline) by temporarily limiting
      const origDifficulty = freshWorld.difficulty;
      const spawnResult = await spawnOneAIAirline(freshWorld, origDifficulty, player.baseAirport);

      // Get game time for notification
      const worldTimeService = require('./worldTimeService');
      const currentGameTime = worldTimeService.getCurrentTime(world.id) || new Date();

      const aiName = spawnResult?.airlineName || 'A new airline';
      const aiBase = spawnResult?.baseAirport;
      const baseInfo = aiBase ? ` based at ${aiBase.icaoCode} (${aiBase.city || aiBase.name})` : '';
      const isAtPlayerBase = aiBase && player.baseAirport && aiBase.id === player.baseAirport.id;
      const label = isAtPlayerBase ? 'New Competitor' : 'New Airline';

      await notifyPlayer(world.id,
        `${label}: ${aiName}`,
        `${aiName} has entered the market${baseInfo} and will begin operations soon.`,
        currentGameTime,
        { type: 'operations', icon: 'plane', priority: isAtPlayerBase ? 2 : 3, link: '/competition' }
      );

      console.log(`[AI-SPAWN] Replacement AI airline spawned in world ${world.id}`);
    } catch (err) {
      console.error('[AI-SPAWN] Failed to spawn replacement AI:', err.message);
    }
  }, cappedDelay);
}

/**
 * Spawn a single replacement AI airline
 */
async function spawnOneAIAirline(world, difficulty, humanBaseAirport) {
  const { generateAIAirline } = require('../data/aiAirlineNames');
  const { AI_DIFFICULTY } = require('../data/aiDifficultyConfig');
  const config = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;

  const worldYear = new Date(world.startDate).getFullYear();
  const humanRegion = getRegionFromCountry(humanBaseAirport.country);

  // Get existing codes
  const existingMembers = await WorldMembership.findAll({
    where: { worldId: world.id },
    attributes: ['airlineCode', 'iataCode', 'airlineName']
  });
  const existingICAO = new Set(existingMembers.map(m => m.airlineCode).filter(Boolean));
  const existingIATA = new Set(existingMembers.map(m => m.iataCode).filter(Boolean));
  const existingNames = new Set(existingMembers.map(m => m.airlineName).filter(Boolean));

  // Find a base airport
  const airports = await Airport.findAll({
    where: {
      id: { [Op.ne]: humanBaseAirport.id },
      type: { [Op.in]: ['International Hub', 'Major', 'Regional'] }
    },
    order: [['traffic_demand', 'DESC']],
    limit: 50
  });

  if (airports.length === 0) return;

  // Score and pick
  const scored = airports.map(ap => {
    const sameRegion = getRegionFromCountry(ap.country) === humanRegion;
    let score = (ap.trafficDemand || 10) * (0.7 + Math.random() * 0.6);
    if (config.competitorProximity === 'close') score *= sameRegion ? 3 : 1;
    else if (config.competitorProximity === 'far') score *= sameRegion ? 0.5 : 2;
    else score *= sameRegion ? 1.5 : 1;
    return { airport: ap, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const baseAirport = scored[0].airport;

  const aiRegion = getRegionFromCountry(baseAirport.country);
  const personality = pickPersonality(difficulty);
  const airline = generateAIAirline(aiRegion, worldYear, existingICAO, existingIATA, existingNames, baseAirport.country);
  if (!airline.icaoCode || !airline.iataCode) return;

  const startingBalance = eraEconomicService.getStartingCapital(worldYear) * config.startingBalanceMultiplier;

  const membership = await WorldMembership.create({
    userId: null,
    worldId: world.id,
    airlineName: airline.name,
    airlineCode: airline.icaoCode,
    iataCode: airline.iataCode,
    region: baseAirport.country,
    baseAirportId: baseAirport.id,
    balance: startingBalance,
    reputation: 40 + Math.floor(Math.random() * 10),
    isAI: true,
    aiPersonality: personality,
    aiLastDecisionTime: new Date(),
    cleaningContractor: pickAIContractorTier(),
    groundContractor: pickAIContractorTier(),
    engineeringContractor: pickAIContractorTier()
  });

  console.log(`[AI-SPAWN] Replacement: ${airline.name} (${airline.icaoCode}) at ${baseAirport.icaoCode} [${personality}]`);

  // Give initial fleet
  const availableAircraft = await Aircraft.findAll({
    where: { availableFrom: { [Op.lte]: worldYear } },
    order: [['passengerCapacity', 'ASC']]
  });
  const eraAircraft = availableAircraft.filter(ac => !ac.availableUntil || ac.availableUntil >= worldYear);

  if (eraAircraft.length > 0) {
    const { assignInitialFleet } = require('./aiSpawningService');
    if (typeof assignInitialFleet === 'function') {
      await assignInitialFleet(membership, baseAirport, eraAircraft, config, new Set());
    }
  }

  return { airlineName: airline.name, baseAirport };
}

/**
 * Map country to region (duplicated from aiSpawningService for standalone use)
 */
function getRegionFromCountry(country) {
  const regionMap = {
    'United Kingdom': 'Europe', 'France': 'Europe', 'Germany': 'Europe', 'Spain': 'Europe',
    'Italy': 'Europe', 'Netherlands': 'Europe', 'Switzerland': 'Europe', 'Sweden': 'Europe',
    'Norway': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe', 'Ireland': 'Europe',
    'Portugal': 'Europe', 'Greece': 'Europe', 'Poland': 'Europe', 'Turkey': 'Europe',
    'United States': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
    'China': 'Asia', 'Japan': 'Asia', 'South Korea': 'Asia', 'India': 'Asia',
    'Singapore': 'Asia', 'Thailand': 'Asia', 'Malaysia': 'Asia', 'Indonesia': 'Asia',
    'United Arab Emirates': 'Middle East', 'Saudi Arabia': 'Middle East', 'Qatar': 'Middle East',
    'South Africa': 'Africa', 'Egypt': 'Africa', 'Kenya': 'Africa', 'Nigeria': 'Africa',
    'Brazil': 'South America', 'Argentina': 'South America', 'Chile': 'South America',
    'Australia': 'Oceania', 'New Zealand': 'Oceania'
  };
  return regionMap[country] || 'Europe';
}

module.exports = {
  processAIDecisions
};
