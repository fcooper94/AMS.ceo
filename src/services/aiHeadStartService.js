/**
 * AI Head-Start Service
 *
 * Gives spawned AI airlines a synthetic head-start so a newly created world can
 * feel "already established". Instead of every AI starting as an empty shell and
 * growing lazily from game-time zero (the 'brand_new' maturity), each AI is aged
 * by a random amount and given a pre-built fleet, route network, scheduled
 * flights and plausible finances/reputation to match.
 *
 * The player always joins as a brand-new airline — this only ages the rivals.
 *
 * Design notes:
 *  - Runs in the BACKGROUND after the world-create response (like waypoint
 *    backfill), so the HTTP request stays fast even for ~740 AI airlines.
 *  - Shared data (era aircraft list, per-base destination lists) is loaded/
 *    memoised once; fleet/routes/flights use bulkCreate to keep DB round-trips
 *    low.
 *  - Route waypoints are intentionally NOT computed here — the existing
 *    airwayService.backfillMissingWaypoints() background pass picks up any route
 *    missing waypoints.
 *  - Each head-started airline has aiLastDecisionTime set to the world clock so
 *    the AI decision engine defers its first cycle by one interval, avoiding a
 *    race with this background build.
 */

const { Op } = require('sequelize');
const { WorldMembership, Airport, Aircraft, UserAircraft, Route, ScheduledFlight } = require('../models');
const { AI_DIFFICULTY, AIRLINE_ARCHETYPES } = require('../data/aiDifficultyConfig');
const eraEconomicService = require('./eraEconomicService');
const routeDemandService = require('./routeDemandService');

// Per-airline age window applied for each maturity preset (game-days).
// 'brand_new' has no entry — those worlds skip the head-start entirely.
const MATURITY_PRESETS = {
  developing:  { minDays: 7,   maxDays: 56,  label: 'Developing' },   // ~1–8 weeks
  established: { minDays: 60,  maxDays: 180, label: 'Established' },   // ~2–6 months
  mature:      { minDays: 180, maxDays: 420, label: 'Mature' }        // ~6–14 months
};

// Rough ceiling on how big an incumbent at a given airport type should get.
const MAX_FLEET_BY_TYPE = {
  'International Hub': 12,
  'Major':            6,
  'Regional':         3,
  'Small Regional':   2
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-first packing order

// ─── Small self-contained helpers (kept independent of aiDecisionService) ────

function calculateDistanceNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getMaxCapacityForAirport(airportType) {
  switch (airportType) {
    case 'International Hub': return 9999;
    case 'Major':             return 350;
    case 'Regional':          return 200;
    case 'Small Regional':    return 100;
    default:                  return 200;
  }
}

const REG_PREFIXES = {
  'United Kingdom': 'G-', 'United States': 'N', 'France': 'F-', 'Germany': 'D-',
  'Japan': 'JA-', 'Australia': 'VH-', 'Canada': 'C-', 'Brazil': 'PT-',
  'China': 'B-', 'India': 'VT-', 'Italy': 'I-', 'Spain': 'EC-',
  'Netherlands': 'PH-', 'Switzerland': 'HB-', 'Sweden': 'SE-',
  'South Africa': 'ZS-', 'Singapore': '9V-', 'United Arab Emirates': 'A6-',
  'South Korea': 'HL', 'Thailand': 'HS-', 'Turkey': 'TC-'
};

function makeRegistration(prefix, existingRegs) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const suffixLen = prefix.endsWith('-') ? 4 : (prefix.length === 1 ? 5 : 4);
  for (let i = 0; i < 100; i++) {
    let reg = prefix;
    for (let j = 0; j < suffixLen; j++) reg += chars[Math.floor(Math.random() * 26)];
    if (!existingRegs.has(reg)) { existingRegs.add(reg); return reg; }
  }
  const fallback = prefix + 'AI' + Math.floor(Math.random() * 10000);
  existingRegs.add(fallback);
  return fallback;
}

function makeFlightNumber(iataCode, existingNumbers) {
  for (let i = 0; i < 200; i++) {
    const fn = `${iataCode}${100 + Math.floor(Math.random() * 900)}`;
    if (!existingNumbers.has(fn)) { existingNumbers.add(fn); return fn; }
  }
  const fallback = `${iataCode}${Math.floor(Math.random() * 9000) + 1000}`;
  existingNumbers.add(fallback);
  return fallback;
}

// Days per week for a route given demand — compact version of the decision
// service's calculateSmartFrequency.
function daysPerWeekForDemand(demandScore) {
  if (demandScore >= 55) return 7;
  if (demandScore >= 35) return 5;
  if (demandScore >= 18) return 4;
  return 2 + Math.floor(Math.random() * 2); // 2–3
}

// Estimate operating cost per passenger — mirrors aiDecisionService's
// calculateOperatingCostPerPax so seeded history looks consistent with live math.
// Mirrors aiDecisionService's calculateOperatingCostPerPax — shared formula via
// eraEconomicService.calculateFlightCosts so seeded history stays consistent.
function estOperatingCostPerPax(distance, paxCapacity, worldYear) {
  const estPax = Math.max(1, Math.round(paxCapacity * 0.75));
  const { totalCosts } = eraEconomicService.calculateFlightCosts(distance * 2, paxCapacity, worldYear, estPax);
  return Math.round(totalCosts / estPax);
}

function pickAircraftWithCommonality(pool, preferredFamily) {
  if (preferredFamily) {
    const { aircraftFamilyKey } = require('../utils/aircraftFamily');
    const same = pool.filter(ac => aircraftFamilyKey(ac.manufacturer, ac.model) === preferredFamily);
    if (same.length > 0 && Math.random() < 0.75) return same[Math.floor(Math.random() * same.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// Compute a scheduled-flight row for one (route, aircraft, day-of-week).
function buildScheduledFlight(routeId, aircraftId, dow, depTime, distance, cruiseSpeed, turnaround) {
  const speed = cruiseSpeed || 450;
  const outboundMinutes = (distance / speed) * 60;
  const totalMinutes = outboundMinutes + (turnaround || 45) + outboundMinutes;

  const refDate = new Date('2024-01-07T00:00:00'); // a Sunday
  refDate.setDate(refDate.getDate() + dow);
  const dep = new Date(`${refDate.toISOString().split('T')[0]}T${depTime}`);
  const arr = new Date(dep.getTime() + totalMinutes * 60 * 1000);

  const pad = n => String(n).padStart(2, '0');
  const arrivalTime = `${pad(arr.getHours())}:${pad(arr.getMinutes())}:00`;
  const arrivalDayOffset = Math.round((new Date(`${arr.getFullYear()}-${pad(arr.getMonth() + 1)}-${pad(arr.getDate())}T00:00:00`) -
    new Date(`${dep.getFullYear()}-${pad(dep.getMonth() + 1)}-${pad(dep.getDate())}T00:00:00`)) / 86400000);
  const [dh, dm] = depTime.split(':').map(Number);
  const totalDurationMinutes = (arrivalDayOffset * 1440) + (arr.getHours() * 60 + arr.getMinutes()) - (dh * 60 + dm);

  return {
    routeId, aircraftId, dayOfWeek: dow,
    departureTime: depTime, arrivalTime, arrivalDayOffset,
    totalDurationMinutes, isActive: true
  };
}

// ─── Destination lookup (memoised per base airport) ──────────────────────────

async function getDestinationsForBase(baseAirportId, worldYear, cache) {
  if (cache.has(baseAirportId)) return cache.get(baseAirportId);

  let opportunities = [];
  try {
    opportunities = await routeDemandService.getTopDestinations(baseAirportId, worldYear, 25);
  } catch (_) { opportunities = []; }
  opportunities = (opportunities || []).filter(o => o.airport && o.airport.id);

  // Fallback (e.g. local dev where the demand cache only holds EGLL): top
  // airports by traffic demand.
  if (opportunities.length === 0) {
    const airports = await Airport.findAll({
      where: { id: { [Op.ne]: baseAirportId } },
      order: [['traffic_demand', 'DESC']],
      limit: 25
    });
    opportunities = airports.map(ap => ({ airport: ap, demand: 45, routeType: 'mixed' }));
  }

  cache.set(baseAirportId, opportunities);
  return opportunities;
}

// ─── Per-airline build ───────────────────────────────────────────────────────

/**
 * Build a synthetic network for a single AI airline aged `ageDays`.
 * Returns the number of routes created (0 if it couldn't build anything).
 */
async function headStartAirline(airline, world, config, worldYear, eraAircraft, destCache, gameTime) {
  const baseAirport = airline.baseAirport;
  if (!baseAirport || !baseAirport.latitude || !baseAirport.longitude) return 0;

  const preset = MATURITY_PRESETS[world.aiMaturity];
  if (!preset) return 0;

  const ageDays = preset.minDays + Math.floor(Math.random() * (preset.maxDays - preset.minDays + 1));
  const ageWeeks = ageDays / 7;

  // Target fleet size: ~1 aircraft per 4 game-weeks, capped by airport type and
  // the difficulty's max fleet size.
  const typeCap = MAX_FLEET_BY_TYPE[baseAirport.type] || 3;
  const cap = Math.max(1, Math.min(config.maxFleetSize || 15, typeCap));
  const fleetSize = Math.max(1, Math.min(cap, 1 + Math.floor(ageWeeks / 4)));

  // Size-appropriate, commonality-biased fleet.
  const maxPax = getMaxCapacityForAirport(baseAirport.type);
  const pool = (() => {
    const fit = eraAircraft.filter(ac => ac.passengerCapacity > 0 && ac.passengerCapacity <= maxPax && ac.type !== 'Airship');
    return fit.length > 0 ? fit : eraAircraft.filter(ac => ac.passengerCapacity > 0 && ac.type !== 'Airship');
  })();
  if (pool.length === 0) return 0;

  const startingCapital = eraEconomicService.getStartingCapital(worldYear);
  const regPrefix = REG_PREFIXES[airline.region] || 'XX-';
  const existingRegs = new Set();

  const membershipId = airline.id;
  const fleetRows = [];
  const fleetMeta = []; // { id, aircraft } parallel to created rows
  let preferredFamily = null;
  let fleetCost = 0;
  const now = new Date(gameTime);

  const crypto = require('crypto');
  for (let i = 0; i < fleetSize; i++) {
    const ac = pickAircraftWithCommonality(pool, preferredFamily);
    if (i === 0) preferredFamily = require('../utils/aircraftFamily').aircraftFamilyKey(ac.manufacturer, ac.model);
    const reg = makeRegistration(regPrefix, existingRegs);
    const purchasePrice = parseFloat(ac.purchasePrice) || 50000000;
    fleetCost += purchasePrice;
    const uaId = crypto.randomUUID();
    fleetRows.push({
      id: uaId,
      worldMembershipId: membershipId,
      aircraftId: ac.id,
      registration: reg,
      acquisitionType: 'purchase',
      purchasePrice,
      totalFlightHours: Math.floor(ageWeeks * (8 + Math.random() * 20)), // plausible hours for its age
      status: 'active',
      autoScheduleDaily: true,
      autoScheduleWeekly: true,
      lastDailyCheckDate: now,
      lastWeeklyCheckDate: now,
      lastACheckDate: now,
      lastACheckHours: 0,
      lastCCheckDate: now,
      lastDCheckDate: now
    });
    fleetMeta.push({ id: uaId, aircraft: ac });
  }

  await UserAircraft.bulkCreate(fleetRows, { validate: false });

  // Destinations for this base, best demand first.
  const opportunities = await getDestinationsForBase(airline.baseAirportId, worldYear, destCache);
  const archetype = AIRLINE_ARCHETYPES[airline.airlineType] || AIRLINE_ARCHETYPES.fullService;

  const usedDest = new Set();
  const existingFlightNums = new Set();
  const routeRows = [];
  const flightRows = [];
  let accumulatedProfit = 0;

  // Assign 1–2 routes per aircraft, packing onto free days across the week.
  for (const meta of fleetMeta) {
    const ac = meta.aircraft;
    const rangeNm = ac.rangeNm || (ac.cruiseSpeed || 450) * 12;
    const usedDays = new Set();
    const routesForThisAircraft = 1 + (Math.random() < 0.45 ? 1 : 0);

    for (let r = 0; r < routesForThisAircraft; r++) {
      // Find the next viable destination for this aircraft.
      let picked = null;
      for (const opp of opportunities) {
        const dest = opp.airport;
        if (!dest || usedDest.has(dest.id) || dest.id === airline.baseAirportId) continue;
        if (!dest.latitude || !dest.longitude) continue;
        const distance = calculateDistanceNm(
          parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude),
          parseFloat(dest.latitude), parseFloat(dest.longitude)
        );
        if (distance < 50) continue;
        if (distance > (archetype.maxRouteDistance || 99999)) continue;
        if (archetype.minRouteDistance && distance < archetype.minRouteDistance) continue;
        if (!archetype.canFlyInternational && baseAirport.country !== dest.country) continue;
        if (distance > rangeNm * 0.95) continue;
        // Don't stack a long-haul route onto an aircraft that already has one.
        if (usedDays.size > 0 && distance >= 2500) continue;
        picked = { dest, distance, demand: opp.demand || 45, routeType: opp.routeType || 'mixed' };
        break;
      }
      if (!picked) break;

      const { dest, distance, demand } = picked;
      usedDest.add(dest.id);

      // Days-of-week packed onto this aircraft's free days.
      const want = daysPerWeekForDemand(demand);
      const freeDays = DAY_ORDER.filter(d => !usedDays.has(d));
      if (freeDays.length === 0) break;
      const routeDays = freeDays.slice(0, Math.min(want, freeDays.length)).sort((a, b) => a - b);
      routeDays.forEach(d => usedDays.add(d));

      const paxCapacity = ac.passengerCapacity || 150;
      let turnaround = 45;
      if (paxCapacity > 250) turnaround = 75;
      else if (paxCapacity > 150) turnaround = 60;
      else if (paxCapacity < 80) turnaround = 30;

      // Curfew-aware departure: ≥06:00 local, and prefer an hour whose
      // round trip lands back by ~23:00 local (overnight flying is fine,
      // antisocial takeoffs/landings are not — mirrors aiDecisionService)
      const rtMinutes = (distance / (ac.cruiseSpeed || 450)) * 60 * 2 + turnaround;
      const baseUtcOffset = Math.round((parseFloat(airline.baseAirport?.longitude) || 0) / 15);
      const candidates = [];
      for (let h = 6; h <= 19; h++) {
        const arrLocal = (h + rtMinutes / 60) % 24;
        if (arrLocal >= 6 && arrLocal <= 23) candidates.push(h);
      }
      const depLocal = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : 6 + Math.floor(Math.random() * 14);
      const depHour = ((depLocal - baseUtcOffset) % 24 + 24) % 24;
      const depTime = `${String(depHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 12) * 5).padStart(2, '0')}:00`;

      const priceMod = (archetype.pricingModifier || 1.0) * (config.pricingModifier || 1.0);
      const economyPrice = Math.round(eraEconomicService.calculateTicketPrice(distance, worldYear, 'economy') * priceMod);
      const routeId = crypto.randomUUID();

      // Seed plausible operating history for the airline's age.
      const totalFlights = Math.max(1, Math.round(ageWeeks * routeDays.length));
      const loadFactor = 0.55 + Math.random() * 0.25; // 0.55–0.80 (stored as a fraction)
      const paxPerFlight = Math.round(paxCapacity * loadFactor);
      const revPerFlight = Math.round(paxPerFlight * economyPrice * 1.15); // small premium/cargo uplift
      const costPerFlight = paxPerFlight * estOperatingCostPerPax(distance, paxCapacity, worldYear);
      const totalRevenue = revPerFlight * totalFlights;
      const totalCosts = costPerFlight * totalFlights;
      accumulatedProfit += (totalRevenue - totalCosts);

      routeRows.push({
        id: routeId,
        worldMembershipId: membershipId,
        routeNumber: makeFlightNumber(airline.iataCode, existingFlightNums),
        returnRouteNumber: makeFlightNumber(airline.iataCode, existingFlightNums),
        departureAirportId: airline.baseAirportId,
        arrivalAirportId: dest.id,
        assignedAircraftId: meta.id,
        distance,
        scheduledDepartureTime: depTime,
        turnaroundTime: turnaround,
        frequency: routeDays.length >= 7 ? 'daily' : 'weekly',
        daysOfWeek: routeDays,
        demand,
        ticketPrice: economyPrice,
        economyPrice,
        economyPlusPrice: Math.round(economyPrice * 1.3),
        businessPrice: Math.round(economyPrice * 2.5),
        firstPrice: Math.round(economyPrice * 4),
        cargoLightRate: Math.round(distance * 0.5),
        cargoStandardRate: Math.round(distance * 0.8),
        cargoHeavyRate: Math.round(distance * 1.2),
        transportType: ({ passenger: 'passengers_only', cargo: 'cargo_only', both: 'both' })[archetype.transportType] || 'both',
        isActive: true,
        totalFlights,
        totalRevenue,
        totalCosts,
        totalPassengers: paxPerFlight * totalFlights,
        averageLoadFactor: Number(loadFactor.toFixed(2))
      });

      for (const dow of routeDays) {
        flightRows.push(buildScheduledFlight(routeId, meta.id, dow, depTime, distance, ac.cruiseSpeed, turnaround));
      }
    }
  }

  if (routeRows.length > 0) await Route.bulkCreate(routeRows, { validate: false });
  if (flightRows.length > 0) await ScheduledFlight.bulkCreate(flightRows, { validate: false });

  // Configure each route's cabin/cargo to match it (same as the live AI path), so
  // head-started routes don't fly all-economy. Non-critical — never block on it.
  try {
    const aiFleetConfigService = require('./aiFleetConfigService');
    for (let i = 0; i < routeRows.length; i++) {
      const rr = routeRows[i];
      const meta = fleetMeta.find(m => m.id === rr.assignedAircraftId);
      if (!meta) continue;
      const routeInstance = await Route.findByPk(rr.id);
      const acInstance = await UserAircraft.findByPk(rr.assignedAircraftId, { include: [{ model: Aircraft, as: 'aircraft' }] });
      const destAirport = await Airport.findByPk(rr.arrivalAirportId);
      if (routeInstance && acInstance && destAirport) {
        await aiFleetConfigService.applyRouteConfig(routeInstance, acInstance, {
          baseAirport, destAirport, distanceNm: parseFloat(rr.distance), worldYear, archetype: airline.airlineType
        });
      }
    }
  } catch (_) { /* non-critical */ }

  // Finances & reputation, aged to match. Balance = starting funds, minus the
  // fleet bought, plus accumulated profit — floored so the airline isn't born
  // bankrupt. Reputation drifts up with age.
  const baseBalance = startingCapital * (config.startingBalanceMultiplier || 1.0);
  let balance = baseBalance - fleetCost + accumulatedProfit;
  const floor = startingCapital * 0.15;
  if (balance < floor) balance = floor + Math.random() * startingCapital * 0.1;

  const reputation = Math.max(40, Math.min(80, Math.round((airline.reputation || 50) + Math.min(20, ageWeeks * 0.35))));

  await airline.update({
    balance: Math.round(balance),
    reputation,
    // Defer the AI decision engine's first cycle by one interval so it doesn't
    // race this background build.
    aiLastDecisionTime: new Date(gameTime)
  });

  return routeRows.length;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Give all AI airlines in a world a synthetic head-start based on the world's
 * maturity preset. No-op for 'brand_new'. Intended to run in the background.
 *
 * @param {World} world - the created world (needs id, aiMaturity, currentTime, startDate, difficulty)
 * @param {string} difficulty
 * @param {Airport|null} humanBaseAirport - player's base, so its competitors build first
 */
async function applyHeadStart(world, difficulty, humanBaseAirport) {
  const preset = MATURITY_PRESETS[world.aiMaturity];
  if (!preset) return; // brand_new or unknown → nothing to do

  const config = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;
  const worldYear = new Date(world.startDate).getFullYear();
  const gameTime = new Date(world.currentTime || world.startDate);

  console.log(`[AI-HEADSTART] Building ${preset.label} networks for world "${world.name}"...`);

  // Load the era aircraft list once.
  const available = await Aircraft.findAll({
    where: { availableFrom: { [Op.lte]: worldYear } },
    order: [['passengerCapacity', 'ASC']]
  });
  const eraAircraft = available.filter(ac => !ac.availableUntil || ac.availableUntil >= worldYear);
  if (eraAircraft.length === 0) {
    console.warn('[AI-HEADSTART] No era-appropriate aircraft found, aborting');
    return;
  }

  const aiAirlines = await WorldMembership.findAll({
    where: { worldId: world.id, isAI: true, isActive: true },
    include: [{ model: Airport, as: 'baseAirport' }]
  });

  // Build the player's-base competitors first so they show up soonest.
  if (humanBaseAirport) {
    aiAirlines.sort((a, b) => {
      const aBase = a.baseAirportId === humanBaseAirport.id ? 0 : 1;
      const bBase = b.baseAirportId === humanBaseAirport.id ? 0 : 1;
      return aBase - bBase;
    });
  }

  const destCache = new Map();
  let built = 0, routesTotal = 0;
  for (const airline of aiAirlines) {
    try {
      const n = await headStartAirline(airline, world, config, worldYear, eraAircraft, destCache, gameTime);
      if (n > 0) { built++; routesTotal += n; }
    } catch (err) {
      console.error(`[AI-HEADSTART] Failed for ${airline.airlineName}: ${err.message}`);
    }
    // Yield periodically so the event loop / game clock stays responsive.
    if (built % 50 === 0 && built > 0) {
      await new Promise(r => setImmediate(r));
      console.log(`[AI-HEADSTART] Progress: ${built} airlines, ${routesTotal} routes...`);
    }
  }

  console.log(`[AI-HEADSTART] Done: ${built}/${aiAirlines.length} airlines head-started (${preset.label}), ${routesTotal} routes created`);
}

module.exports = { applyHeadStart, MATURITY_PRESETS };
