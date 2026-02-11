/**
 * AI Spawning Service
 * Generates AI airlines when a single-player world is created.
 * Spawns hundreds of AI airlines across top airports globally.
 */

const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { WorldMembership, Airport, Aircraft, UserAircraft, Route, ScheduledFlight } = require('../models');
const crypto = require('crypto');
const { generateAIAirline } = require('../data/aiAirlineNames');
const { AI_DIFFICULTY, pickPersonality } = require('../data/aiDifficultyConfig');
const eraEconomicService = require('./eraEconomicService');

/**
 * Map a country to a broad region for name generation
 */
function getRegionFromCountry(country) {
  const regionMap = {
    // Europe
    'United Kingdom': 'Europe', 'France': 'Europe', 'Germany': 'Europe', 'Spain': 'Europe',
    'Italy': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe', 'Switzerland': 'Europe',
    'Austria': 'Europe', 'Sweden': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe',
    'Finland': 'Europe', 'Ireland': 'Europe', 'Portugal': 'Europe', 'Greece': 'Europe',
    'Poland': 'Europe', 'Czech Republic': 'Europe', 'Hungary': 'Europe', 'Romania': 'Europe',
    'Turkey': 'Europe', 'Iceland': 'Europe', 'Luxembourg': 'Europe', 'Croatia': 'Europe',
    // North America
    'United States': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
    // Asia
    'China': 'Asia', 'Japan': 'Asia', 'South Korea': 'Asia', 'India': 'Asia',
    'Thailand': 'Asia', 'Singapore': 'Asia', 'Malaysia': 'Asia', 'Indonesia': 'Asia',
    'Philippines': 'Asia', 'Vietnam': 'Asia', 'Taiwan': 'Asia', 'Hong Kong': 'Asia',
    // Middle East
    'United Arab Emirates': 'Middle East', 'Saudi Arabia': 'Middle East', 'Qatar': 'Middle East',
    'Bahrain': 'Middle East', 'Oman': 'Middle East', 'Kuwait': 'Middle East', 'Israel': 'Middle East',
    'Jordan': 'Middle East', 'Lebanon': 'Middle East',
    // Africa
    'South Africa': 'Africa', 'Egypt': 'Africa', 'Kenya': 'Africa', 'Nigeria': 'Africa',
    'Morocco': 'Africa', 'Ethiopia': 'Africa', 'Tanzania': 'Africa', 'Ghana': 'Africa',
    // South America
    'Brazil': 'South America', 'Argentina': 'South America', 'Chile': 'South America',
    'Colombia': 'South America', 'Peru': 'South America', 'Ecuador': 'South America',
    // Oceania
    'Australia': 'Oceania', 'New Zealand': 'Oceania', 'Fiji': 'Oceania',
    'Papua New Guinea': 'Oceania'
  };
  return regionMap[country] || 'Europe';
}

/**
 * Generate a registration prefix based on country
 */
function getRegistrationPrefix(country) {
  const prefixes = {
    'United Kingdom': 'G-', 'United States': 'N', 'France': 'F-', 'Germany': 'D-',
    'Japan': 'JA-', 'Australia': 'VH-', 'Canada': 'C-', 'Brazil': 'PT-',
    'China': 'B-', 'India': 'VT-', 'Italy': 'I-', 'Spain': 'EC-',
    'Netherlands': 'PH-', 'Switzerland': 'HB-', 'Sweden': 'SE-',
    'South Africa': 'ZS-', 'Singapore': '9V-', 'United Arab Emirates': 'A6-',
    'South Korea': 'HL', 'Thailand': 'HS-', 'Turkey': 'TC-'
  };
  return prefixes[country] || 'XX-';
}

/**
 * Generate a random registration for an AI aircraft
 */
function generateRegistration(prefix, existingRegs) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 100; i++) {
    let reg = prefix;
    const suffixLen = prefix.endsWith('-') ? 4 : (prefix.length === 1 ? 5 : 4);
    for (let j = 0; j < suffixLen; j++) {
      reg += chars[Math.floor(Math.random() * 26)];
    }
    if (!existingRegs.has(reg)) return reg;
  }
  return prefix + 'AI' + Math.floor(Math.random() * 10000);
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
    const num = 100 + Math.floor(Math.random() * 900);
    const fn = `${iataCode}${num}`;
    if (!existingNumbers.has(fn)) return fn;
  }
  return `${iataCode}${Math.floor(Math.random() * 9000) + 1000}`;
}

/**
 * Generate a departure time weighted toward business hours
 */
function generateDepartureTime() {
  const hour = Math.random() < 0.8
    ? 6 + Math.floor(Math.random() * 16)
    : Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 12) * 5;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

/**
 * Pick a destination airport from the pool for an AI route (no DB queries)
 */
function pickDestination(baseAirport, allAirports, usedDestIds, aircraft) {
  const baseLat = parseFloat(baseAirport.latitude);
  const baseLon = parseFloat(baseAirport.longitude);
  const cruiseSpeed = aircraft.cruiseSpeed || 450;
  const maxRange = cruiseSpeed * 12; // 12 hours max flight

  for (let i = 0; i < 30; i++) {
    // Weight toward higher-traffic airports (top of the sorted list)
    const idx = Math.floor(Math.pow(Math.random(), 1.5) * allAirports.length);
    const dest = allAirports[idx];

    if (dest.id === baseAirport.id) continue;
    if (usedDestIds.has(dest.id)) continue;

    const distance = calculateDistanceNm(
      baseLat, baseLon,
      parseFloat(dest.latitude), parseFloat(dest.longitude)
    );

    if (distance >= 100 && distance <= maxRange) {
      return { airport: dest, distance };
    }
  }

  return null;
}

/**
 * Calculate arrival date/time for an AI flight (simplified, no wind)
 */
function calculateArrivalDateTime(departureDate, departureTime, distanceNm, cruiseSpeed, turnaroundMinutes) {
  const depDateTime = new Date(`${departureDate}T${departureTime}`);
  const speed = cruiseSpeed || 450;
  const outboundMinutes = (distanceNm / speed) * 60;
  const returnMinutes = outboundMinutes;
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
 * Spawn AI airlines for a single-player world.
 * Uses tier-based approach: top airports get more airlines, lower tiers get fewer.
 */
async function spawnAIAirlines(world, difficulty, humanBaseAirport) {
  const config = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;
  const worldYear = new Date(world.startDate).getFullYear();
  const tiers = config.spawnTiers;
  const totalAirports = tiers.reduce((sum, t) => sum + t.airports, 0);
  const expectedTotal = tiers.reduce((sum, t) => sum + t.airports * t.aiPerAirport, 0);

  console.log(`[AI-SPAWN] Spawning ~${expectedTotal} AI airlines across ${totalAirports} airports for "${world.name}" (${difficulty})`);

  // Collect existing codes in this world
  const existingMembers = await WorldMembership.findAll({
    where: { worldId: world.id },
    attributes: ['airlineCode', 'iataCode', 'airlineName']
  });
  const existingICAO = new Set(existingMembers.map(m => m.airlineCode).filter(Boolean));
  const existingIATA = new Set(existingMembers.map(m => m.iataCode).filter(Boolean));
  const existingNames = new Set(existingMembers.map(m => m.airlineName).filter(Boolean));

  // Get airports with region-weighted selection
  // Sort by type priority (International Hub first) then by traffic_demand
  // This ensures major hubs get tier 1 (most AI airlines) while small airports get tier 3
  const TYPE_PRIORITY = { 'International Hub': 3, 'Major': 2, 'Regional': 1 };
  const regionWeights = config.regionWeights;
  const allEligible = await Airport.findAll({
    where: {
      type: { [Op.in]: ['International Hub', 'Major', 'Regional'] }
    },
    order: [['traffic_demand', 'DESC']]
  });
  // Sort by type priority first, then traffic_demand (DB sort alone isn't enough
  // because traffic_demand has many ties — 3000+ airports all at 10)
  allEligible.sort((a, b) => {
    const typeDiff = (TYPE_PRIORITY[b.type] || 0) - (TYPE_PRIORITY[a.type] || 0);
    if (typeDiff !== 0) return typeDiff;
    return (b.trafficDemand || 0) - (a.trafficDemand || 0);
  });

  // Group airports by region
  const byRegion = {};
  for (const ap of allEligible) {
    const region = getRegionFromCountry(ap.country);
    (byRegion[region] = byRegion[region] || []).push(ap);
  }

  // Allocate airport slots per region based on weights
  const airports = [];
  let remaining = totalAirports;
  const regionEntries = Object.entries(regionWeights).sort((a, b) => b[1] - a[1]);
  for (const [region, weight] of regionEntries) {
    const quota = Math.round(totalAirports * weight / 100);
    const available = byRegion[region] || [];
    const take = Math.min(quota, available.length, remaining);
    airports.push(...available.slice(0, take));
    remaining -= take;
  }

  // Fill any remaining slots (from rounding) with top airports not yet selected
  if (remaining > 0) {
    const used = new Set(airports.map(a => a.id));
    const extras = allEligible.filter(a => !used.has(a.id)).slice(0, remaining);
    airports.push(...extras);
  }

  // Ensure the player's base airport is in the list (even if it didn't make the region quota)
  if (humanBaseAirport && !airports.find(a => a.id === humanBaseAirport.id)) {
    airports.push(humanBaseAirport);
  }

  // Re-sort by type priority then traffic_demand so tier assignment gives major hubs more airlines
  airports.sort((a, b) => {
    const typeDiff = (TYPE_PRIORITY[b.type] || 0) - (TYPE_PRIORITY[a.type] || 0);
    if (typeDiff !== 0) return typeDiff;
    return (b.trafficDemand || 0) - (a.trafficDemand || 0);
  });

  console.log(`[AI-SPAWN] Region distribution: ${regionEntries.map(([r, w]) => `${r}: ${(byRegion[r] || []).length} eligible, ${Math.round(totalAirports * w / 100)} slots`).join(', ')}`);

  if (airports.length === 0) {
    console.warn('[AI-SPAWN] No airports found, aborting');
    return;
  }

  // Get era-appropriate aircraft
  const availableAircraft = await Aircraft.findAll({
    where: { availableFrom: { [Op.lte]: worldYear } },
    order: [['passengerCapacity', 'ASC']]
  });
  const eraAircraft = availableAircraft.filter(ac => {
    if (!ac.availableUntil) return true;
    return ac.availableUntil >= worldYear;
  });

  if (eraAircraft.length === 0) {
    console.warn('[AI-SPAWN] No era-appropriate aircraft found, creating airlines without fleet');
  }

  // Categorize aircraft by size (done once)
  const smallAircraft = eraAircraft.filter(ac => ac.passengerCapacity <= 100);
  const mediumAircraft = eraAircraft.filter(ac => ac.passengerCapacity > 100 && ac.passengerCapacity <= 250);
  const largeAircraft = eraAircraft.filter(ac => ac.passengerCapacity > 250);

  const existingRegs = new Set();
  const startingBalance = eraEconomicService.getStartingCapital(worldYear) * config.startingBalanceMultiplier;

  // Build the spawn plan: assign airports to tiers
  let airportIdx = 0;
  let totalCreated = 0;
  let totalRoutes = 0;
  const BATCH_SIZE = 50;

  // Collect membership + fleet + route + flight data for bulk insert
  let membershipBatch = [];
  let fleetBatch = [];
  let routeBatch = [];
  let flightBatch = [];
  // Templates are created once per day-of-week (7 templates per route)

  // --- Guaranteed competition at the player's base airport (created FIRST for code priority) ---
  if (humanBaseAirport && config.baseAirportCompetitors) {
    const baseType = humanBaseAirport.type || 'Regional';
    const baseCompConfig = config.baseAirportCompetitors[baseType] || { min: 1, max: 1 };
    const targetCompetitors = baseCompConfig.min + Math.floor(Math.random() * (baseCompConfig.max - baseCompConfig.min + 1));

    console.log(`[AI-SPAWN] Base airport ${humanBaseAirport.icaoCode} (${baseType}): spawning ${targetCompetitors} guaranteed competitors first`);

    const baseRegion = getRegionFromCountry(humanBaseAirport.country);
    const baseTier = tiers[1] || tiers[0];

    for (let b = 0; b < targetCompetitors; b++) {
      const personality = pickPersonality(difficulty);
      const airline = generateAIAirline(baseRegion, worldYear, existingICAO, existingIATA, existingNames, humanBaseAirport.country);
      if (!airline.icaoCode || !airline.iataCode) {
        console.warn(`[AI-SPAWN] Failed to generate codes for base competitor ${b + 1}/${targetCompetitors}`);
        continue;
      }

      existingICAO.add(airline.icaoCode);
      existingIATA.add(airline.iataCode);
      existingNames.add(airline.name);

      const membershipId = crypto.randomUUID();
      const fleetSize = baseTier.fleetSize.min +
        Math.floor(Math.random() * (baseTier.fleetSize.max - baseTier.fleetSize.min + 1));

      const isHub = humanBaseAirport.type === 'International Hub';
      const pool = isHub
        ? [...mediumAircraft, ...largeAircraft, ...smallAircraft]
        : [...smallAircraft, ...mediumAircraft];

      let balance = startingBalance;
      const airlineFleet = [];

      if (pool.length > 0 && eraAircraft.length > 0) {
        const regPrefix = getRegistrationPrefix(humanBaseAirport.country);
        for (let f = 0; f < fleetSize; f++) {
          const ac = pool[Math.floor(Math.random() * pool.length)];
          const reg = generateRegistration(regPrefix, existingRegs);
          existingRegs.add(reg);
          const purchasePrice = parseFloat(ac.purchasePrice) || 50000000;
          balance -= purchasePrice;
          const fleetId = crypto.randomUUID();
          airlineFleet.push({ id: fleetId, aircraftId: ac.id, registration: reg, purchasePrice, aircraft: ac });
        }
      }

      const staggerDays = Math.floor(Math.random() * config.decisionIntervalGameDays);
      const staggeredTime = new Date(world.startDate);
      staggeredTime.setDate(staggeredTime.getDate() - staggerDays);

      membershipBatch.push({
        id: membershipId,
        userId: null,
        worldId: world.id,
        airlineName: airline.name,
        airlineCode: airline.icaoCode,
        iataCode: airline.iataCode,
        region: humanBaseAirport.country,
        baseAirportId: humanBaseAirport.id,
        balance,
        reputation: 45 + Math.floor(Math.random() * 15),
        isAI: true,
        aiPersonality: personality,
        aiLastDecisionTime: staggeredTime
      });

      for (const fi of airlineFleet) {
        fleetBatch.push({
          id: fi.id,
          worldMembershipId: membershipId,
          aircraftId: fi.aircraftId,
          registration: fi.registration,
          acquisitionType: 'purchase',
          purchasePrice: fi.purchasePrice,
          totalFlightHours: Math.floor(Math.random() * 500),
          autoScheduleDaily: true,
          autoScheduleWeekly: true,
          lastDailyCheckDate: world.startDate,
          lastWeeklyCheckDate: world.startDate,
          lastACheckDate: world.startDate,
          lastACheckHours: 0,
          lastCCheckDate: world.startDate,
          lastDCheckDate: world.startDate
        });
      }

      // Create routes for base competitors
      const usedDestIds = new Set();
      const existingFlightNums = new Set();

      for (const fi of airlineFleet) {
        const dest = pickDestination(humanBaseAirport, airports, usedDestIds, fi.aircraft);
        if (!dest) continue;
        usedDestIds.add(dest.airport.id);

        const outboundNum = generateFlightNumber(airline.iataCode, existingFlightNums);
        existingFlightNums.add(outboundNum);
        const returnNum = generateFlightNumber(airline.iataCode, existingFlightNums);
        existingFlightNums.add(returnNum);

        const economyPrice = Math.round(
          eraEconomicService.calculateTicketPrice(dest.distance, worldYear, 'economy') * config.pricingModifier
        );

        const paxCapacity = fi.aircraft.passengerCapacity || 150;
        let turnaroundTime = 45;
        if (paxCapacity > 250) turnaroundTime = 75;
        else if (paxCapacity > 150) turnaroundTime = 60;
        else if (paxCapacity < 80) turnaroundTime = 30;

        const routeId = crypto.randomUUID();
        const depTime = generateDepartureTime();

        routeBatch.push({
          id: routeId,
          worldMembershipId: membershipId,
          routeNumber: outboundNum,
          returnRouteNumber: returnNum,
          departureAirportId: humanBaseAirport.id,
          arrivalAirportId: dest.airport.id,
          assignedAircraftId: fi.id,
          distance: dest.distance,
          scheduledDepartureTime: depTime,
          turnaroundTime,
          frequency: 'daily',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          ticketPrice: economyPrice,
          economyPrice,
          economyPlusPrice: Math.round(economyPrice * 1.3),
          businessPrice: Math.round(economyPrice * 2.5),
          firstPrice: Math.round(economyPrice * 4),
          cargoLightRate: Math.round(dest.distance * 0.5),
          cargoStandardRate: Math.round(dest.distance * 0.8),
          cargoHeavyRate: Math.round(dest.distance * 1.2),
          transportType: 'both',
          demand: 50,
          isActive: true
        });

        const cruiseSpeed = fi.aircraft.cruiseSpeed || 450;
        const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];

        for (const dow of daysOfWeek) {
          const refDate = new Date('2024-01-07T00:00:00');
          refDate.setDate(refDate.getDate() + dow);
          const refDateStr = refDate.toISOString().split('T')[0];

          const { arrivalDate: refArrDate, arrivalTime } = calculateArrivalDateTime(
            refDateStr, depTime, dest.distance, cruiseSpeed, turnaroundTime
          );
          const arrivalDayOffset = Math.round((new Date(refArrDate + 'T00:00:00') - new Date(refDateStr + 'T00:00:00')) / 86400000);

          const [depH, depM] = depTime.split(':').map(Number);
          const [arrH, arrM] = arrivalTime.split(':').map(Number);
          const totalDurationMinutes = arrivalDayOffset * 1440 + (arrH * 60 + arrM) - (depH * 60 + depM);

          flightBatch.push({
            id: crypto.randomUUID(),
            routeId,
            aircraftId: fi.id,
            dayOfWeek: dow,
            departureTime: depTime,
            arrivalTime,
            arrivalDayOffset,
            totalDurationMinutes,
            isActive: true
          });
        }

        totalRoutes++;
      }

      totalCreated++;
    }

    // Flush base airport batch immediately
    if (membershipBatch.length > 0) {
      await flushBatch(membershipBatch, fleetBatch, routeBatch, flightBatch);
      membershipBatch = [];
      fleetBatch = [];
      routeBatch = [];
      flightBatch = [];
    }

    console.log(`[AI-SPAWN] Base airport competitors created: ${totalCreated}`);
  }

  for (const tier of tiers) {
    const tierEnd = Math.min(airportIdx + tier.airports, airports.length);

    for (; airportIdx < tierEnd; airportIdx++) {
      const airport = airports[airportIdx];
      const region = getRegionFromCountry(airport.country);

      for (let a = 0; a < tier.aiPerAirport; a++) {
        const personality = pickPersonality(difficulty);
        const airline = generateAIAirline(region, worldYear, existingICAO, existingIATA, existingNames, airport.country);
        if (!airline.icaoCode || !airline.iataCode) continue;

        existingICAO.add(airline.icaoCode);
        existingIATA.add(airline.iataCode);
        existingNames.add(airline.name);

        const membershipId = crypto.randomUUID();

        // Calculate fleet and deduct from balance
        const fleetSize = tier.fleetSize.min +
          Math.floor(Math.random() * (tier.fleetSize.max - tier.fleetSize.min + 1));

        const isHub = airport.type === 'International Hub';
        const pool = isHub
          ? [...mediumAircraft, ...largeAircraft, ...smallAircraft]
          : [...smallAircraft, ...mediumAircraft];

        let balance = startingBalance;
        const airlineFleet = []; // track for route creation

        if (pool.length > 0 && eraAircraft.length > 0) {
          const regPrefix = getRegistrationPrefix(airport.country);
          for (let f = 0; f < fleetSize; f++) {
            const ac = pool[Math.floor(Math.random() * pool.length)];
            const reg = generateRegistration(regPrefix, existingRegs);
            existingRegs.add(reg);
            const purchasePrice = parseFloat(ac.purchasePrice) || 50000000;
            balance -= purchasePrice;
            const fleetId = crypto.randomUUID();
            airlineFleet.push({ id: fleetId, aircraftId: ac.id, registration: reg, purchasePrice, aircraft: ac });
          }
        }

        // Stagger decision times across the interval so airlines don't all trigger at once
        const staggerDays = Math.floor(Math.random() * config.decisionIntervalGameDays);
        const staggeredTime = new Date(world.startDate);
        staggeredTime.setDate(staggeredTime.getDate() - staggerDays);

        membershipBatch.push({
          id: membershipId,
          userId: null,
          worldId: world.id,
          airlineName: airline.name,
          airlineCode: airline.icaoCode,
          iataCode: airline.iataCode,
          region: airport.country,
          baseAirportId: airport.id,
          balance,
          reputation: 45 + Math.floor(Math.random() * 15),
          isAI: true,
          aiPersonality: personality,
          aiLastDecisionTime: staggeredTime
        });

        for (const fi of airlineFleet) {
          fleetBatch.push({
            id: fi.id,
            worldMembershipId: membershipId,
            aircraftId: fi.aircraftId,
            registration: fi.registration,
            acquisitionType: 'purchase',
            purchasePrice: fi.purchasePrice,
            totalFlightHours: Math.floor(Math.random() * 500),
            autoScheduleDaily: true,
            autoScheduleWeekly: true,
            lastDailyCheckDate: world.startDate,
            lastWeeklyCheckDate: world.startDate,
            lastACheckDate: world.startDate,
            lastACheckHours: 0,
            lastCCheckDate: world.startDate,
            lastDCheckDate: world.startDate
          });
        }

        // Create initial routes: 1 route per aircraft
        const usedDestIds = new Set();
        const existingFlightNums = new Set();

        for (const fi of airlineFleet) {
          const dest = pickDestination(airport, airports, usedDestIds, fi.aircraft);
          if (!dest) continue;
          usedDestIds.add(dest.airport.id);

          const outboundNum = generateFlightNumber(airline.iataCode, existingFlightNums);
          existingFlightNums.add(outboundNum);
          const returnNum = generateFlightNumber(airline.iataCode, existingFlightNums);
          existingFlightNums.add(returnNum);

          const economyPrice = Math.round(
            eraEconomicService.calculateTicketPrice(dest.distance, worldYear, 'economy') * config.pricingModifier
          );

          const paxCapacity = fi.aircraft.passengerCapacity || 150;
          let turnaroundTime = 45;
          if (paxCapacity > 250) turnaroundTime = 75;
          else if (paxCapacity > 150) turnaroundTime = 60;
          else if (paxCapacity < 80) turnaroundTime = 30;

          const routeId = crypto.randomUUID();
          const depTime = generateDepartureTime();

          routeBatch.push({
            id: routeId,
            worldMembershipId: membershipId,
            routeNumber: outboundNum,
            returnRouteNumber: returnNum,
            departureAirportId: airport.id,
            arrivalAirportId: dest.airport.id,
            assignedAircraftId: fi.id,
            distance: dest.distance,
            scheduledDepartureTime: depTime,
            turnaroundTime,
            frequency: 'daily',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            ticketPrice: economyPrice,
            economyPrice,
            economyPlusPrice: Math.round(economyPrice * 1.3),
            businessPrice: Math.round(economyPrice * 2.5),
            firstPrice: Math.round(economyPrice * 4),
            cargoLightRate: Math.round(dest.distance * 0.5),
            cargoStandardRate: Math.round(dest.distance * 0.8),
            cargoHeavyRate: Math.round(dest.distance * 1.2),
            transportType: 'both',
            demand: 50,
            isActive: true
          });

          // Create weekly flight templates (one per day-of-week)
          const cruiseSpeed = fi.aircraft.cruiseSpeed || 450;
          const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // All days
          // Use a reference Sunday to calculate arrival times
          const refSunday = '2024-01-07'; // A known Sunday

          for (const dow of daysOfWeek) {
            const refDate = new Date('2024-01-07T00:00:00');
            refDate.setDate(refDate.getDate() + dow);
            const refDateStr = refDate.toISOString().split('T')[0];

            const { arrivalDate: refArrDate, arrivalTime } = calculateArrivalDateTime(
              refDateStr, depTime, dest.distance, cruiseSpeed, turnaroundTime
            );
            const arrivalDayOffset = Math.round((new Date(refArrDate + 'T00:00:00') - new Date(refDateStr + 'T00:00:00')) / 86400000);

            const [depH, depM] = depTime.split(':').map(Number);
            const [arrH, arrM] = arrivalTime.split(':').map(Number);
            const totalDurationMinutes = arrivalDayOffset * 1440 + (arrH * 60 + arrM) - (depH * 60 + depM);

            flightBatch.push({
              id: crypto.randomUUID(),
              routeId,
              aircraftId: fi.id,
              dayOfWeek: dow,
              departureTime: depTime,
              arrivalTime,
              arrivalDayOffset,
              totalDurationMinutes,
              isActive: true
            });
          }

          totalRoutes++;
        }

        totalCreated++;

        // Flush batches periodically to avoid excessive memory usage
        if (membershipBatch.length >= BATCH_SIZE) {
          await flushBatch(membershipBatch, fleetBatch, routeBatch, flightBatch);
          membershipBatch = [];
          fleetBatch = [];
          routeBatch = [];
          flightBatch = [];
          if (totalCreated % 100 === 0) {
            console.log(`[AI-SPAWN] Progress: ${totalCreated} airlines, ${totalRoutes} routes created...`);
          }
        }
      }
    }
  }

  // Flush remaining from main tier loop
  if (membershipBatch.length > 0) {
    await flushBatch(membershipBatch, fleetBatch, routeBatch, flightBatch);
    membershipBatch = [];
    fleetBatch = [];
    routeBatch = [];
    flightBatch = [];
  }

  console.log(`[AI-SPAWN] Finished spawning ${totalCreated} AI airlines with ${totalRoutes} routes (${totalRoutes * 7} flight templates) across ${airportIdx} airports`);
}

/**
 * Bulk insert a batch of memberships, fleet, routes, and flights
 */
async function flushBatch(memberships, fleet, routes, flights) {
  await WorldMembership.bulkCreate(memberships, { validate: false });
  if (fleet.length > 0) {
    await UserAircraft.bulkCreate(fleet, { validate: false });
  }
  if (routes && routes.length > 0) {
    await Route.bulkCreate(routes, { validate: false });
  }
  if (flights && flights.length > 0) {
    await ScheduledFlight.bulkCreate(flights, { validate: false });
  }
}

/**
 * Assign initial fleet to a single AI airline (used by replacement spawning)
 */
async function assignInitialFleet(membership, baseAirport, eraAircraft, config, existingRegs) {
  // Use tier 2 fleet size as default for replacement airlines
  const tierConfig = config.spawnTiers ? config.spawnTiers[1] : null;
  const fleetMin = tierConfig ? tierConfig.fleetSize.min : 2;
  const fleetMax = tierConfig ? tierConfig.fleetSize.max : 4;
  const fleetSize = fleetMin + Math.floor(Math.random() * (fleetMax - fleetMin + 1));

  const regPrefix = getRegistrationPrefix(membership.region);

  const smallAircraft = eraAircraft.filter(ac => ac.passengerCapacity <= 100);
  const mediumAircraft = eraAircraft.filter(ac => ac.passengerCapacity > 100 && ac.passengerCapacity <= 250);
  const largeAircraft = eraAircraft.filter(ac => ac.passengerCapacity > 250);

  const isHub = baseAirport.type === 'International Hub';
  const pool = isHub
    ? [...mediumAircraft, ...largeAircraft, ...smallAircraft]
    : [...smallAircraft, ...mediumAircraft];

  if (pool.length === 0) return;

  const fleetData = [];
  for (let i = 0; i < fleetSize; i++) {
    const aircraft = pool[Math.floor(Math.random() * pool.length)];
    const reg = generateRegistration(regPrefix, existingRegs);
    existingRegs.add(reg);
    const purchasePrice = parseFloat(aircraft.purchasePrice) || 50000000;
    membership.balance = parseFloat(membership.balance) - purchasePrice;

    fleetData.push({
      worldMembershipId: membership.id,
      aircraftId: aircraft.id,
      registration: reg,
      acquisitionType: 'purchase',
      purchasePrice,
      totalFlightHours: Math.floor(Math.random() * 500),
      autoScheduleDaily: true,
      autoScheduleWeekly: true,
      lastDailyCheckDate: new Date(membership.joinedAt || new Date()),
      lastWeeklyCheckDate: new Date(membership.joinedAt || new Date()),
      lastACheckDate: new Date(membership.joinedAt || new Date()),
      lastACheckHours: 0,
      lastCCheckDate: new Date(membership.joinedAt || new Date()),
      lastDCheckDate: new Date(membership.joinedAt || new Date())
    });
  }

  if (fleetData.length > 0) {
    await UserAircraft.bulkCreate(fleetData, { validate: false });
  }
  await membership.save();
}

module.exports = {
  spawnAIAirlines,
  assignInitialFleet
};
